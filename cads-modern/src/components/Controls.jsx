import React from 'react';

function Controls({
  onLoadImages,
  onProcess,
  onExport,
  onLoadStudy,
  onResumeCheckpoint,
  onPauseToggle,
  paused,
  processing,
  hasImages,
  hasClustering,
  cvReady,
  hasCheckpoint
}) {
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

      {processing && (
        <button className="button" onClick={onPauseToggle}>
          {paused ? '▶️ Continue' : '⏸️ Pause'}
        </button>
      )}

      {hasCheckpoint && !processing && (
        <button
          className="button secondary"
          onClick={onResumeCheckpoint}
          disabled={!cvReady}
        >
          ▶️ Resume Saved Analysis
        </button>
      )}

      <button
        className="button"
        onClick={onLoadStudy}
        disabled={processing}
      >
        📂 Load Study
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
