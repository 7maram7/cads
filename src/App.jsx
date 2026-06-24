import React, { useState, useEffect, useRef } from 'react';
import ImageLoader from './components/ImageLoader';
import Dendrogram from './components/Dendrogram';
import DieGroups from './components/DieGroups';
import Controls from './components/Controls';
import { detectFeatures, buildDescriptorMat, matchDescriptorMats } from './utils/featureDetection';
import { performClustering } from './utils/clustering';

const { ipcRenderer } = window.require('electron');

// OpenCV.js is bundled locally in public/opencv.js — no internet connection needed.
// A single module-level promise guarantees it only loads once, even across
// React re-renders / StrictMode double-mounting.
let openCVPromise = null;

function loadOpenCV() {
  if (openCVPromise) return openCVPromise;

  // IMPORTANT: this promise must NEVER be resolved with the cv module itself.
  // opencv.js 4.x's window.cv is an emscripten thenable that "resolves" to
  // itself, so passing it through native Promise resolution (resolve(cv),
  // await cv, .then chains) triggers infinite thenable unwrapping and hard-
  // freezes the renderer. We resolve with `true` and consumers use window.cv.
  openCVPromise = new Promise((resolve, reject) => {
    if (window.cv && window.cv.Mat) {
      resolve(true);
      return;
    }

    // Electron with nodeIntegration exposes `module`/`exports` as globals,
    // which makes opencv.js's UMD wrapper take the CommonJS branch and never
    // set window.cv. Hide them while the script loads, restore afterwards.
    const savedModule = window.module;
    const savedExports = window.exports;
    window.module = undefined;
    window.exports = undefined;
    const restoreGlobals = () => {
      window.module = savedModule;
      window.exports = savedExports;
    };

    const script = document.createElement('script');
    script.src = './opencv.js'; // served from public/ in dev, copied to dist/ in builds
    script.async = true;

    script.onerror = () => {
      restoreGlobals();
      reject(new Error('Could not load the bundled opencv.js file.'));
    };

    script.onload = () => {
      restoreGlobals();

      const finish = (cvModule) => {
        window.cv = cvModule;
        if (cvModule && cvModule.Mat) {
          // Remove the self-resolving `then` so window.cv can never be
          // accidentally awaited into an infinite loop later.
          try { delete cvModule.then; } catch (e) { /* ignore */ }
          resolve(true);
        } else {
          reject(new Error('OpenCV loaded but cv.Mat is missing.'));
        }
      };

      if (window.cv && typeof window.cv.then === 'function') {
        // opencv.js 4.x exposes window.cv as an emscripten pseudo-promise
        // that resolves to ITSELF. Never `await` it — call .then() once.
        window.cv.then(finish);
      } else if (window.cv && window.cv.Mat) {
        finish(window.cv);
      } else if (window.cv) {
        // Older builds (3.4): wait for the runtime-initialized callback.
        window.cv.onRuntimeInitialized = () => finish(window.cv);
      } else {
        reject(new Error('opencv.js loaded but did not define window.cv.'));
      }

      // Safety net: WASM compilation can take a while on slow machines,
      // but if nothing happens after 60s, surface an error.
      setTimeout(() => {
        if (!window.cv || !window.cv.Mat) {
          reject(new Error('OpenCV WASM runtime did not initialize within 60 seconds.'));
        }
      }, 60000);
    };

    document.body.appendChild(script);
  });

  return openCVPromise;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function formatDuration(ms) {
  if (ms == null || !isFinite(ms) || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

// How often (in pairs) the partial distance matrix is flushed to disk.
const CHECKPOINT_EVERY_PAIRS = 20000;

function App() {
  const [images, setImages] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [timing, setTiming] = useState({ elapsed: 0, remaining: null });
  const [features, setFeatures] = useState([]);
  const [clustering, setClustering] = useState(null);
  const [cvReady, setCvReady] = useState(false);
  const [cvError, setCvError] = useState(null);
  const [checkpoint, setCheckpoint] = useState(null);

  // Pause / timing bookkeeping (refs so the processing loops see live values)
  const pauseRef = useRef(false);
  const pauseStartRef = useRef(0);
  const pausedAccumRef = useRef(0);
  const phaseStartRef = useRef(0);
  const lastUiUpdateRef = useRef(0);

  // Load OpenCV.js once on mount, and check for a saved checkpoint
  useEffect(() => {
    loadOpenCV()
      .then(() => {
        console.log('OpenCV.js ready');
        setCvReady(true);
      })
      .catch((error) => {
        console.error('OpenCV failed to load:', error);
        setCvError(error.message);
      });

    ipcRenderer.invoke('checkpoint-exists').then((meta) => {
      if (meta) setCheckpoint(meta);
    });
  }, []);

  // ---- timing helpers ------------------------------------------------------

  const beginPhase = () => {
    phaseStartRef.current = Date.now();
    pausedAccumRef.current = 0;
    lastUiUpdateRef.current = 0;
    setTiming({ elapsed: 0, remaining: null });
  };

  // Elapsed working time in the current phase, excluding time spent paused
  const activeElapsed = () => {
    const pausedNow = pauseRef.current ? Date.now() - pauseStartRef.current : 0;
    return Date.now() - phaseStartRef.current - pausedAccumRef.current - pausedNow;
  };

  // Throttled progress + ETA update. `done`/`left` describe the work rate for
  // the ETA (they differ from current/total when resuming mid-run).
  const updateProgress = (current, total, status, done = current, left = total - current) => {
    const now = Date.now();
    if (now - lastUiUpdateRef.current < 300) return;
    lastUiUpdateRef.current = now;
    setProgress({ current, total, status });
    const elapsed = activeElapsed();
    setTiming({
      elapsed,
      remaining: done > 0 ? (elapsed / done) * left : null
    });
  };

  const waitWhilePaused = async () => {
    while (pauseRef.current) {
      await sleep(250);
    }
  };

  const handlePauseToggle = () => {
    if (!pauseRef.current) {
      pauseRef.current = true;
      pauseStartRef.current = Date.now();
      setPaused(true);
    } else {
      pausedAccumRef.current += Date.now() - pauseStartRef.current;
      pauseRef.current = false;
      setPaused(false);
    }
  };

  // ---- processing ----------------------------------------------------------

  const handleLoadImages = async () => {
    const imagePaths = await ipcRenderer.invoke('select-folder');
    if (imagePaths && imagePaths.length > 0) {
      setImages(imagePaths);
      setFeatures([]);
      setClustering(null);
    }
  };

  const detectAllFeatures = async (imagePaths) => {
    beginPhase();
    const allFeatures = [];
    for (let i = 0; i < imagePaths.length; i++) {
      await waitWhilePaused();
      updateProgress(i + 1, imagePaths.length, `Detecting features (image ${i + 1}/${imagePaths.length})`);
      const f = await detectFeatures(imagePaths[i]);
      allFeatures.push({ imagePath: imagePaths[i], ...f });
    }
    return allFeatures;
  };

  // Runs (or resumes) pairwise matching, then clustering.
  // `flatDistances` is the upper-triangle distance matrix in row-major pair
  // order; pairs before `startPair` are assumed already computed.
  const runMatchingAndCluster = async (allFeatures, flatDistances, startPair) => {
    const cv = window.cv;
    const n = allFeatures.length;
    const totalPairs = (n * (n - 1)) / 2;

    beginPhase();

    // Build each image's descriptor Mat once — vastly faster than rebuilding
    // two Mats for every one of the n*(n-1)/2 pairs.
    const descMats = allFeatures.map((f) => buildDescriptorMat(f));
    const bf = new cv.BFMatcher(cv.NORM_HAMMING, true);

    try {
      let pairIndex = 0;
      let sinceSave = 0;

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          if (pairIndex < startPair) {
            pairIndex++;
            continue;
          }

          if (pairIndex % 200 === 0) {
            await waitWhilePaused();
            await sleep(0); // let the UI repaint
            updateProgress(
              pairIndex,
              totalPairs,
              `Comparing pairs (${pairIndex.toLocaleString()}/${totalPairs.toLocaleString()})`,
              pairIndex - startPair,
              totalPairs - pairIndex
            );
          }

          flatDistances[pairIndex] = matchDescriptorMats(bf, descMats[i], descMats[j]);
          pairIndex++;
          sinceSave++;

          if (sinceSave >= CHECKPOINT_EVERY_PAIRS) {
            sinceSave = 0;
            await ipcRenderer.invoke('checkpoint-save-distances', flatDistances, pairIndex);
          }
        }
      }

      // Build the full symmetric matrix for clustering
      setProgress({ current: 0, total: 0, status: 'Building distance matrix...' });
      await sleep(30);
      const distanceMatrix = Array.from({ length: n }, () => new Array(n).fill(0));
      let k = 0;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const d = flatDistances[k++];
          distanceMatrix[i][j] = d;
          distanceMatrix[j][i] = d;
        }
      }

      setProgress({ current: 0, total: 0, status: 'Clustering (can take a while for large studies)...' });
      await sleep(30); // let the UI paint before the long synchronous clustering

      const clusterResult = performClustering(distanceMatrix, allFeatures);
      setClustering(clusterResult);

      // Done — the checkpoint is no longer needed
      await ipcRenderer.invoke('checkpoint-clear');
      setCheckpoint(null);
      setProgress({ current: 0, total: 0, status: 'Complete!' });
      setTiming({ elapsed: activeElapsed(), remaining: null });
    } finally {
      descMats.forEach((m) => m.delete());
      bf.delete();
    }
  };

  const handleProcessImages = async () => {
    if (!cvReady) {
      alert('OpenCV is still loading. Please wait a moment and try again.');
      return;
    }
    if (images.length === 0) {
      alert('Please load images first');
      return;
    }

    setProcessing(true);
    setClustering(null);
    pauseRef.current = false;
    setPaused(false);

    try {
      // A fresh run supersedes any old checkpoint
      await ipcRenderer.invoke('checkpoint-clear');
      setCheckpoint(null);

      // Step 1: detect features
      const allFeatures = await detectAllFeatures(images);
      setFeatures(allFeatures.map((f) => ({ imagePath: f.imagePath, keypointCount: f.keypointCount })));

      // Checkpoint the detected features so matching can resume after a restart
      const totalBytes = allFeatures.reduce((sum, f) => sum + f.descriptors.length, 0);
      const descBlob = new Uint8Array(totalBytes);
      let offset = 0;
      for (const f of allFeatures) {
        descBlob.set(f.descriptors, offset);
        offset += f.descriptors.length;
      }
      const cols = allFeatures.find((f) => f.descRows > 0)?.descCols || 32;
      await ipcRenderer.invoke(
        'checkpoint-save-features',
        descBlob,
        allFeatures.map((f) => f.descRows),
        cols,
        allFeatures.map((f) => f.keypointCount)
      );
      await ipcRenderer.invoke('checkpoint-save-meta', {
        images,
        phase: 'matching',
        pairIndex: 0,
        savedAt: Date.now()
      });

      // Step 2 + 3: matching and clustering
      const n = allFeatures.length;
      const flatDistances = new Float32Array((n * (n - 1)) / 2);
      await runMatchingAndCluster(allFeatures, flatDistances, 0);
    } catch (error) {
      console.error('Error processing images:', error);
      alert('Error processing images: ' + error.message);
    } finally {
      pauseRef.current = false;
      setPaused(false);
      setProcessing(false);
    }
  };

  const handleResumeCheckpoint = async () => {
    if (!cvReady) {
      alert('OpenCV is still loading. Please wait a moment and try again.');
      return;
    }

    const data = await ipcRenderer.invoke('checkpoint-load');
    if (!data) {
      setCheckpoint(null);
      alert('The saved analysis could not be loaded.');
      return;
    }

    setProcessing(true);
    setClustering(null);
    pauseRef.current = false;
    setPaused(false);

    try {
      const { meta, featureInfo, descriptors, distances } = data;
      const descBytes = new Uint8Array(
        descriptors.buffer ?? descriptors,
        descriptors.byteOffset ?? 0,
        descriptors.byteLength ?? descriptors.length
      );

      // Rebuild per-image features from the binary checkpoint
      const allFeatures = [];
      let offset = 0;
      meta.images.forEach((imagePath, idx) => {
        const rows = featureInfo.rows[idx];
        const len = rows * featureInfo.cols;
        allFeatures.push({
          imagePath,
          descriptors: descBytes.subarray(offset, offset + len),
          descRows: rows,
          descCols: featureInfo.cols,
          keypointCount: featureInfo.keypointCounts[idx]
        });
        offset += len;
      });

      setImages(meta.images);
      setFeatures(allFeatures.map((f) => ({ imagePath: f.imagePath, keypointCount: f.keypointCount })));

      const n = meta.images.length;
      const flatDistances = new Float32Array((n * (n - 1)) / 2);
      if (distances) {
        const saved = new Float32Array(
          distances.buffer ?? distances,
          distances.byteOffset ?? 0,
          Math.floor((distances.byteLength ?? distances.length) / 4)
        );
        flatDistances.set(saved.subarray(0, flatDistances.length));
      }

      await runMatchingAndCluster(allFeatures, flatDistances, meta.pairIndex || 0);
    } catch (error) {
      console.error('Error resuming analysis:', error);
      alert('Error resuming analysis: ' + error.message);
    } finally {
      pauseRef.current = false;
      setPaused(false);
      setProcessing(false);
    }
  };

  const handleLoadStudy = async () => {
    const data = await ipcRenderer.invoke('open-study');
    if (!data) return;
    if (data.error) {
      alert(data.error);
      return;
    }
    if (!data.clustering) {
      alert('This file does not look like an exported CADS study.');
      return;
    }
    setImages(data.images || []);
    setFeatures(
      (data.features || []).map((f) => ({
        imagePath: f.imagePath,
        keypointCount: f.keypointCount || 0
      }))
    );
    setClustering(data.clustering);
  };

  const handleExport = async () => {
    if (!clustering) {
      alert('No clustering data to export');
      return;
    }

    const exportData = {
      timestamp: new Date().toISOString(),
      imageCount: images.length,
      images: images,
      clustering: clustering,
      features: features.map((f) => ({
        imagePath: f.imagePath,
        keypointCount: f.keypointCount
      }))
    };

    const filename = `cads-study-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`;
    const success = await ipcRenderer.invoke('save-file', exportData, filename);

    if (success) {
      alert('Study exported successfully! You can reopen it later with "Load Study".');
    }
  };

  const totalKeypoints = features.reduce((sum, f) => sum + (f.keypointCount || 0), 0);

  return (
    <div className="app">
      <header className="header">
        <h1>CADS - Computer-Aided Die Study</h1>
        <p>Modern tool for numismatic die analysis using computer vision</p>
      </header>

      <div className="main-content">
        <div className="sidebar">
          <Controls
            onLoadImages={handleLoadImages}
            onProcess={handleProcessImages}
            onExport={handleExport}
            onLoadStudy={handleLoadStudy}
            onResumeCheckpoint={handleResumeCheckpoint}
            onPauseToggle={handlePauseToggle}
            paused={paused}
            processing={processing}
            hasImages={images.length > 0}
            hasClustering={clustering !== null}
            cvReady={cvReady}
            hasCheckpoint={checkpoint !== null}
          />

          {checkpoint && !processing && (
            <div className="info-panel" style={{ fontSize: '0.8rem', color: '#7f8c8d' }}>
              Unfinished analysis found ({checkpoint.images?.length?.toLocaleString()} images,
              saved {new Date(checkpoint.savedAt).toLocaleString()}). Use "Resume Saved Analysis"
              to continue where it left off.
            </div>
          )}

          {processing && (
            <div className="progress-section">
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{
                    width: progress.total > 0
                      ? `${(progress.current / progress.total) * 100}%`
                      : '0%'
                  }}
                />
              </div>
              <div className="status">
                {paused ? '⏸️ Paused — ' : ''}
                {progress.status}
              </div>
              <div className="status" style={{ fontSize: '0.75rem', color: '#7f8c8d' }}>
                Elapsed: {formatDuration(timing.elapsed)}
                {timing.remaining != null && !paused && ` · Remaining: ~${formatDuration(timing.remaining)}`}
              </div>
            </div>
          )}

          <div className="info-panel">
            <h3 style={{ marginBottom: '1rem' }}>Study Information</h3>
            <div className="info-item">
              <span className="info-label">Images Loaded:</span>
              <span className="info-value">{images.length.toLocaleString()}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Features Detected:</span>
              <span className="info-value">{totalKeypoints.toLocaleString()}</span>
            </div>
            <div className="info-item">
              <span className="info-label">OpenCV Status:</span>
              <span className="info-value" style={{ color: cvReady ? '#27ae60' : '#e74c3c' }}>
                {cvReady ? 'Ready' : cvError ? 'Failed' : 'Loading...'}
              </span>
            </div>
            {cvError && (
              <div className="info-item" style={{ color: '#e74c3c', fontSize: '0.8rem' }}>
                {cvError}
              </div>
            )}
          </div>

          {images.length > 0 && (
            <ImageLoader images={images} />
          )}
        </div>

        <div className="content">
          {clustering ? (
            <div className="dendrogram-container">
              <Dendrogram data={clustering} images={images} />
              <DieGroups clustering={clustering} />
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-state-icon">📊</div>
              <h2>No Data Yet</h2>
              <p>Load coin images and click "Analyze Dies" to begin</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
