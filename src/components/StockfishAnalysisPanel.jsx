// src/components/StockfishAnalysisPanel.jsx
import React, { useEffect, useState } from 'react';
import { useChessAnalysis } from '../hooks/useChessAnalysis';

const StockfishAnalysisPanel = ({ position, onAnalysisUpdate }) => {
  const {
    isReady,
    isAnalyzing,
    currentAnalysis,
    error,
    quickAnalyze,
    deepAnalyze
  } = useChessAnalysis();

  const [analysisMode, setAnalysisMode] = useState('quick');

  // Auto-analyze when position changes
  useEffect(() => {
    if (position && isReady) {
      handleAnalyze();
    }
  }, [position, isReady]);

  // Update parent component when analysis completes
  useEffect(() => {
    if (currentAnalysis) {
      onAnalysisUpdate?.(currentAnalysis);
    }
  }, [currentAnalysis, onAnalysisUpdate]);

  const handleAnalyze = async () => {
    try {
      const analysis = analysisMode === 'quick' 
        ? await quickAnalyze(position)
        : await deepAnalyze(position);
      
      console.log('✅ Analysis complete:', analysis);
    } catch (err) {
      console.error('❌ Analysis failed:', err);
    }
  };

  const formatEvaluation = (eval) => {
    if (!eval) return '0.00';
    
    if (eval.type === 'mate') {
      const sign = eval.value > 0 ? '+' : '';
      return `${sign}M${Math.abs(eval.value)}`;
    } else {
      const sign = eval.value > 0 ? '+' : '';
      return `${sign}${eval.value.toFixed(2)}`;
    }
  };

  const getEvaluationColor = (eval) => {
    if (!eval) return '#666';
    if (eval.type === 'mate') return eval.value > 0 ? '#27ae60' : '#e74c3c';
    if (eval.value > 1) return '#27ae60';
    if (eval.value < -1) return '#e74c3c';
    return '#666';
  };

  if (error) {
    return (
      <div style={styles.panel}>
        <div style={styles.error}>
          ❌ {error}
        </div>
        <div style={styles.fallback}>
          Using enhanced heuristics instead
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div style={styles.panel}>
        <div style={styles.loading}>
          🐟 Loading Stockfish engine...
        </div>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h3 style={styles.title}>Stockfish Analysis</h3>
        <div style={styles.controls}>
          <button
            onClick={() => setAnalysisMode('quick')}
            style={{
              ...styles.modeButton,
              ...(analysisMode === 'quick' ? styles.activeModeButton : {})
            }}
          >
            Quick
          </button>
          <button
            onClick={() => setAnalysisMode('deep')}
            style={{
              ...styles.modeButton,
              ...(analysisMode === 'deep' ? styles.activeModeButton : {})
            }}
          >
            Deep
          </button>
        </div>
      </div>

      {isAnalyzing && (
        <div style={styles.analyzing}>
          ⚡ Analyzing... ({analysisMode} mode)
        </div>
      )}

      {currentAnalysis && (
        <div style={styles.results}>
          <div style={styles.evaluation}>
            <span style={styles.evalLabel}>Evaluation:</span>
            <span 
              style={{
                ...styles.evalValue,
                color: getEvaluationColor(currentAnalysis.evaluation)
              }}
            >
              {formatEvaluation(currentAnalysis.evaluation)}
            </span>
          </div>

          {currentAnalysis.bestMove && (
            <div style={styles.bestMove}>
              <span style={styles.moveLabel}>Best Move:</span>
              <span style={styles.moveValue}>
                {currentAnalysis.bestMove}
              </span>
            </div>
          )}

          <div style={styles.metadata}>
            <span>Depth: {currentAnalysis.depth}</span>
            <span>Nodes: {currentAnalysis.nodes?.toLocaleString()}</span>
            <span>Time: {currentAnalysis.timeMs}ms</span>
          </div>

          {currentAnalysis.principalVariation?.length > 0 && (
            <div style={styles.pv}>
              <div style={styles.pvLabel}>Principal Variation:</div>
              <div style={styles.pvMoves}>
                {currentAnalysis.principalVariation.slice(0, 6).join(' ')}
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={handleAnalyze}
        disabled={isAnalyzing || !position}
        style={styles.analyzeButton}
      >
        {isAnalyzing ? 'Analyzing...' : 'Analyze Position'}
      </button>
    </div>
  );
};

const styles = {
  panel: {
    backgroundColor: '#f8f9fa',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    padding: '16px',
    margin: '8px 0'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  title: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#2c3e50'
  },
  controls: {
    display: 'flex',
    gap: '4px'
  },
  modeButton: {
    padding: '4px 8px',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px'
  },
  activeModeButton: {
    backgroundColor: '#007bff',
    color: 'white',
    borderColor: '#007bff'
  },
  loading: {
    textAlign: 'center',
    color: '#666',
    padding: '20px'
  },
  error: {
    color: '#e74c3c',
    fontWeight: 'bold',
    marginBottom: '8px'
  },
  fallback: {
    color: '#666',
    fontSize: '12px'
  },
  analyzing: {
    color: '#007bff',
    fontWeight: 'bold',
    marginBottom: '12px'
  },
  results: {
    marginBottom: '12px'
  },
  evaluation: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  evalLabel: {
    fontWeight: 'bold'
  },
  evalValue: {
    fontFamily: 'monospace',
    fontSize: '18px',
    fontWeight: 'bold'
  },
  bestMove: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px'
  },
  moveLabel: {
    fontWeight: 'bold'
  },
  moveValue: {
    fontFamily: 'monospace',
    fontSize: '16px',
    color: '#27ae60'
  },
  metadata: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#666',
    marginBottom: '8px'
  },
  pv: {
    marginTop: '8px'
  },
  pvLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '4px'
  },
  pvMoves: {
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#666'
  },
  analyzeButton: {
    width: '100%',
    padding: '8px',
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold'
  }
};

export default StockfishAnalysisPanel;
