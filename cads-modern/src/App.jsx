import React, { useState, useEffect } from 'react';
import ImageLoader from './components/ImageLoader';
import Dendrogram from './components/Dendrogram';
import Controls from './components/Controls';

const { ipcRenderer } = window.require('electron');

function App() {
  const [images, setImages] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, status: '' });
  const [features, setFeatures] = useState([]);
  const [clustering, setClustering] = useState(null);
  const [pythonReady, setPythonReady] = useState(false);

  // Check if Python is available on mount
  useEffect(() => {
    // Test Python availability
    const checkPython = async () => {
      try {
        // This will be implemented as a simple ping to Python
        setPythonReady(true); // For now, assume it's ready
        console.log('Python backend ready');
      } catch (error) {
        console.error('Python backend not available:', error);
        setPythonReady(false);
      }
    };

    checkPython();
  }, []);

  // Listen for progress updates from Python backend
  useEffect(() => {
    const handleProgress = (event, progressData) => {
      setProgress({
        current: progressData.current,
        total: progressData.total,
        status: progressData.status
      });
    };

    const handleError = (event, errorMessage) => {
      console.error('Python backend error:', errorMessage);
      alert('Analysis error: ' + errorMessage);
    };

    // Register IPC listeners
    ipcRenderer.on('analysis-progress', handleProgress);
    ipcRenderer.on('analysis-error', handleError);

    // Cleanup listeners on unmount
    return () => {
      ipcRenderer.removeListener('analysis-progress', handleProgress);
      ipcRenderer.removeListener('analysis-error', handleError);
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
    if (images.length === 0) {
      alert('Please load images first');
      return;
    }

    if (images.length < 2) {
      alert('Please load at least 2 images for clustering analysis');
      return;
    }

    setProcessing(true);
    setProgress({ current: 0, total: images.length, status: 'Starting analysis...' });

    try {
      // Call Python backend to analyze images
      const result = await ipcRenderer.invoke('analyze-images', images);

      if (!result.success) {
        throw new Error(result.error || 'Analysis failed');
      }

      // Store features and clustering results
      setFeatures(result.features);
      setClustering(result.clustering);

      setProgress({ current: 0, total: 0, status: 'Analysis complete!' });

      console.log('Analysis complete:', {
        featureCount: result.features.length,
        totalFeatures: result.features.reduce((sum, f) => sum + f.num_features, 0)
      });

    } catch (error) {
      console.error('Error processing images:', error);
      alert('Error processing images: ' + error.message);
      setProgress({ current: 0, total: 0, status: 'Error occurred' });
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
        name: f.name,
        path: f.path,
        keypointCount: f.num_features
      }))
    };

    const filename = `cads-study-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.json`;
    const success = await ipcRenderer.invoke('save-file', exportData, filename);

    if (success) {
      alert('Study exported successfully!');
    }
  };

  const totalFeatures = features.length > 0
    ? features.reduce((sum, f) => sum + (f.num_features || 0), 0)
    : 0;

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
            cvReady={pythonReady}
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
              <span className="info-value">{totalFeatures}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Python Backend:</span>
              <span className="info-value" style={{ color: pythonReady ? '#27ae60' : '#e74c3c' }}>
                {pythonReady ? 'Ready' : 'Not Available'}
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
