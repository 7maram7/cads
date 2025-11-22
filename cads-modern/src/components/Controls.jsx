import React from 'react';

function Controls({ onLoadImages, onProcess, onExport, processing, hasImages, hasClustering, cvReady }) {
  return (
    <div className="controls">
      <button
        className="button"
        onClick={onLoadImages}
        disabled={processing}
      >
        📁 Load Coin Images
      </button>

      <button
        className="button secondary"
        onClick={onProcess}
        disabled={!hasImages || processing || !cvReady}
      >
        {processing ? '⏳ Processing...' : '🔍 Analyze Dies'}
      </button>

      <button
        className="button"
        onClick={onExport}
        disabled={!hasClustering || processing}
      >
        💾 Export Results
      </button>
    </div>
  );
}

export default Controls;
