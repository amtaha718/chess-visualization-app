// src/hooks/useChessAnalysis.js
import { useState, useEffect, useRef, useCallback } from 'react';
import ClientStockfish from '../services/ClientStockfish.js';

export const useChessAnalysis = () => {
  const [isReady, setIsReady] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [error, setError] = useState(null);
  
  const stockfishRef = useRef(null);

  // Initialize Stockfish on mount
  useEffect(() => {
    const initializeEngine = async () => {
      try {
        stockfishRef.current = new ClientStockfish();
        await stockfishRef.current.initialize();
        setIsReady(true);
        setError(null);
      } catch (err) {
        console.error('Failed to initialize Stockfish:', err);
        setError('Failed to load chess engine');
        setIsReady(false);
      }
    };

    initializeEngine();

    // Cleanup on unmount
    return () => {
      if (stockfishRef.current) {
        stockfishRef.current.terminate();
      }
    };
  }, []);

  const analyzePosition = useCallback(async (fen, options = {}) => {
    if (!isReady || !stockfishRef.current) {
      throw new Error('Chess engine not ready');
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const analysis = await stockfishRef.current.analyzePosition(fen, options);
      setCurrentAnalysis(analysis);
      return analysis;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  }, [isReady]);

  const quickAnalyze = useCallback((fen) => {
    return analyzePosition(fen, { depth: 10, timeLimit: 1000 });
  }, [analyzePosition]);

  const deepAnalyze = useCallback((fen) => {
    return analyzePosition(fen, { depth: 16, timeLimit: 5000 });
  }, [analyzePosition]);

  return {
    isReady,
    isAnalyzing,
    currentAnalysis,
    error,
    analyzePosition,
    quickAnalyze,
    deepAnalyze
  };
};
