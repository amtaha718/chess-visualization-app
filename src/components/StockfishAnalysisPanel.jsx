// src/components/StockfishAnalysisPanel.jsx
import React from 'react';

const StockfishAnalysisPanel = ({ position, onAnalysisUpdate }) => {
  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      border: '1px solid #e9ecef',
      borderRadius: '8px',
      padding: '16px',
      margin: '8px 0'
    }}>
      <h4>Stockfish Analysis</h4>
      <p>🐟 Stockfish integration coming soon...</p>
      <p>Position: {position ? position.slice(0, 20) + '...' : 'None'}</p>
    </div>
  );
};

export default StockfishAnalysisPanel;
