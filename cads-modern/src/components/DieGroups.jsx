import React, { useState, useEffect, useMemo } from 'react';
import { extractDieGroups } from '../utils/clustering';

const basename = (p) => p.split(/[\\/]/).pop();

/**
 * Shows die groups produced by "cutting" the dendrogram at an adjustable
 * distance threshold. Lower threshold = stricter grouping (more groups).
 */
function DieGroups({ clustering }) {
  const maxDistance = clustering?.distance || 0;
  const [threshold, setThreshold] = useState(maxDistance / 2);

  // Reset the slider when a new study is run
  useEffect(() => {
    setThreshold(maxDistance / 2);
  }, [clustering, maxDistance]);

  const groups = useMemo(
    () => (clustering ? extractDieGroups(clustering, threshold) : []),
    [clustering, threshold]
  );

  if (!clustering) return null;

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2 style={{ marginBottom: '0.5rem', color: '#2c3e50' }}>
        Die Groups ({groups.length})
      </h2>
      <p style={{ marginBottom: '1rem', color: '#7f8c8d', fontSize: '0.9rem' }}>
        Cut the dendrogram at a distance threshold to form candidate die groups.
        Lower values produce stricter (smaller) groups.
      </p>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <label style={{ fontSize: '0.85rem', color: '#2c3e50', whiteSpace: 'nowrap' }}>
          Threshold: {threshold.toFixed(1)}
        </label>
        <input
          type="range"
          min={0}
          max={maxDistance}
          step={maxDistance / 200 || 1}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          style={{ flex: 1 }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {groups.map((group) => (
          <div
            key={group.id}
            style={{
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              background: '#fafafa'
            }}
          >
            <div style={{ fontSize: '0.85rem', color: '#2c3e50', marginBottom: '0.5rem' }}>
              <strong>Group {group.id + 1}</strong> — {group.size} coin{group.size !== 1 ? 's' : ''}
              {group.size > 1 && ` (max distance ${group.similarity.toFixed(1)})`}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {group.images.map((imagePath) => (
                <div key={imagePath} style={{ textAlign: 'center', width: '90px' }} title={imagePath}>
                  <img
                    src={`file://${imagePath}`}
                    alt={basename(imagePath)}
                    loading="lazy"
                    style={{
                      width: '80px',
                      height: '80px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}
                  />
                  <div
                    style={{
                      fontSize: '0.65rem',
                      color: '#7f8c8d',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {basename(imagePath)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DieGroups;
