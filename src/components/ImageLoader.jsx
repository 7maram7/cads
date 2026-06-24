import React from 'react';

function ImageLoader({ images }) {
  return (
    <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <h3 style={{ padding: '1rem 1rem 0.5rem', fontSize: '0.9rem', color: '#7f8c8d' }}>
        Loaded Images ({images.length})
      </h3>
      <div className="image-grid">
        {images.map((imagePath, index) => (
          <div key={index} className="image-thumb" title={imagePath}>
            <img
              src={`file://${imagePath}`}
              alt={`Coin ${index + 1}`}
              loading="lazy"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default ImageLoader;
