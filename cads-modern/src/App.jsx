import React, { useState, useEffect } from 'react';
import ImageLoader from './components/ImageLoader';
import Dendrogram from './components/Dendrogram';
import Controls from './components/Controls';
import { detectFeatures, matchFeatures } from './utils/featureDetection';
import { performClustering } from './utils/clustering';

const { ipcRenderer } = window.require('electron');

function App() {
  const [images, setImages] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [features, setFeatures] = useState([]);
  const [clustering, setClustering] = useState(null);
  const [cvReady, setCvReady] = useState(false);

  // Load OpenCV.js
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
    script.async = true;
    script.onload = () => {
      // Wait for OpenCV to be ready
      const checkCv = setInterval(() => {
        if (window.cv && window.cv.Mat) {
          clearInterval(checkCv);
          setCvReady(true);
          console.log('OpenCV.js is ready');
        }
      }, 100);
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleLoadImages = async () => {
    const imagePaths = await ipcRenderer.invoke('select-folder');
    if (imagePaths && imagePaths.length > 0) {
      setImages(imagePaths);
      setFeatures([]);
      setClustering(null);
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
    setProgress({ current: 0, total: images.length, status: 'Detecting features...' });

    try {
      // Step 1: Detect features in all images
      const allFeatures = [];
      for (let i = 0; i < images.length; i++) {
        setProgress({
          current: i + 1,
          total: images.length,
          status: `Detecting features in image ${i + 1}/${images.length}...`
        });

        const imageFeatures = await detectFeatures(images[i]);
        allFeatures.push({
          imagePath: images[i],
          descriptors: imageFeatures.descriptors,
          keypoints: imageFeatures.keypoints
        });

        // Small delay to allow UI updates
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      setFeatures(allFeatures);
      setProgress({ current: 0, total: 0, status: 'Computing similarity matrix...' });

      // Step 2: Compute distance matrix
      const n = allFeatures.length;
      const distanceMatrix = Array(n).fill(null).map(() => Array(n).fill(0));

      let pairCount = 0;
      const totalPairs = (n * (n - 1)) / 2;

      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          pairCount++;
          setProgress({
            current: pairCount,
            total: totalPairs,
            status: `Comparing images ${i + 1} and ${j + 1}...`
          });

          const distance = matchFeatures(
            allFeatures[i].descriptors,
            allFeatures[j].descriptors
          );

          distanceMatrix[i][j] = distance;
          distanceMatrix[j][i] = distance;

          await new Promise(resolve => setTimeout(resolve, 5));
        }
      }

      // Step 3: Perform hierarchical clustering
      setProgress({ current: 0, total: 0, status: 'Performing clustering...' });

      const clusterResult = performClustering(distanceMatrix, allFeatures);
      setClustering(clusterResult);

      setProgress({ current: 0, total: 0, status: 'Complete!' });
    } catch (error) {
      console.error('Error processing images:', error);
      alert('Error processing images: ' + error.message);
    } finally {
      setProcessing(false);
    }
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
      features: features.map(f => ({
        imagePath: f.imagePath,
        keypointCount: f.keypoints.length
      }))
    };

    const filename = `cads-study-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`;
    const success = await ipcRenderer.invoke('save-file', exportData, filename);

    if (success) {
      alert('Study exported successfully!');
    }
  };

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
            processing={processing}
            hasImages={images.length > 0}
            hasClustering={clustering !== null}
            cvReady={cvReady}
          />

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
                {progress.status}
                {progress.total > 0 && ` (${progress.current}/${progress.total})`}
              </div>
            </div>
          )}

          <div className="info-panel">
            <h3 style={{ marginBottom: '1rem' }}>Study Information</h3>
            <div className="info-item">
              <span className="info-label">Images Loaded:</span>
              <span className="info-value">{images.length}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Features Detected:</span>
              <span className="info-value">
                {features.length > 0 ? features.reduce((sum, f) => sum + f.keypoints.length, 0) : 0}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">OpenCV Status:</span>
              <span className="info-value" style={{ color: cvReady ? '#27ae60' : '#e74c3c' }}>
                {cvReady ? 'Ready' : 'Loading...'}
              </span>
            </div>
          </div>

          {images.length > 0 && (
            <ImageLoader images={images} />
          )}
        </div>

        <div className="content">
          {clustering ? (
            <div className="dendrogram-container">
              <Dendrogram data={clustering} images={images} />
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
