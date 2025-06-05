// src/App.jsx - Temporary version with Stockfish test

import React, { useState } from 'react';
import StockfishTest from './StockfishTest';
// Import your existing App component
// import MainApp from './MainApp'; // You'll rename your current App.jsx to MainApp.jsx

const App = () => {
  const [testMode, setTestMode] = useState(true); // Set to false to use normal app

  const buttonStyle = {
    position: 'fixed',
    top: '10px',
    left: '10px',
    padding: '10px 15px',
    backgroundColor: '#2196F3',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    zIndex: 1000
  };

  if (testMode) {
    return (
      <div>
        <button 
          style={buttonStyle}
          onClick={() => setTestMode(false)}
        >
          Switch to Main App
        </button>
        <StockfishTest />
      </div>
    );
  }

  // For now, show a placeholder - you'll import your actual app here
  return (
    <div>
      <button 
        style={buttonStyle}
        onClick={() => setTestMode(true)}
      >
        Switch to Stockfish Test
      </button>
      <div style={{ padding: '60px 20px', textAlign: 'center' }}>
        <h2>Main Chess App</h2>
        <p>Your existing chess app would go here.</p>
        <p>Rename your current App.jsx to MainApp.jsx and import it above.</p>
      </div>
    </div>
  );
};

export default App;
