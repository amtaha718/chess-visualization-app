import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getIncorrectMoveExplanation, getCorrectMoveExplanation } from './ai';
import './index.css';
import UserSystem from './user-system';
import { AuthModal, UserProfile } from './auth-components';

const getBoardSize = (isExpanded = false) => {
  if (isExpanded) {
    // Expanded mode: 90% of viewport
    return Math.min(window.innerWidth * 0.9, window.innerHeight * 0.9);
  }
  
  // Normal mode
  if (window.innerWidth < 500) {
    return window.innerWidth - 40; // Mobile
  } else if (window.innerWidth < 800) {
    return 450; // Tablet
  } else {
    return 600; // Desktop - much larger like Chess.com
  }
};

// Helper function to determine whose turn it is from FEN
const getActiveColor = (fen) => {
  const parts = fen.split(' ');
  return parts[1] === 'w' ? 'white' : 'black';
};

// Session persistence helpers
const STORAGE_KEY = 'chess-trainer-session';

const saveSessionData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.warn('Failed to save session data:', error);
  }
};

const loadSessionData = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.warn('Failed to load session data:', error);
    return null;
  }
};

// Icon Components (SVG) - 50% larger
const PrevIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="black">
    <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/>
  </svg>
);

const PlayIcon = ({ isPlaying }) => (
  <svg width="27" height="27" viewBox="0 0 24 24" fill="black">
    {isPlaying ? (
      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
    ) : (
      <path d="M8 5v14l11-7z"/>
    )}
  </svg>
);

const HintIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="black">
    <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7z"/>
    <circle cx="12" cy="9" r="1" fill="white"/>
  </svg>
);

const RevealIcon = () => (
  <svg width="27" height="27" viewBox="0 0 24 24" fill="black">
    <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7zm-1 13h2v-6h-2v6zm0-8h2V5h-2v2z"/>
  </svg>
);

const ExpandIcon = ({ isExpanded }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="black">
    {isExpanded ? (
      // Contract icon - arrows pointing inward
      <g>
        <path d="M8 8L3 3M3 3V8M3 3H8"/>
        <path d="M16 8L21 3M21 3V8M21 3H16"/>
        <path d="M8 16L3 21M3 21V16M3 21H8"/>
        <path d="M16 16L21 21M21 21V16M21 21H16"/>
      </g>
    ) : (
      // Expand icon - arrows pointing outward like your image
      <g>
        <path d="M3 8L8 3M8 3H3M8 3V8" strokeWidth="2" stroke="black" fill="none"/>
        <path d="M21 8L16 3M16 3H21M16 3V8" strokeWidth="2" stroke="black" fill="none"/>
        <path d="M3 16L8 21M8 21H3M8 21V16" strokeWidth="2" stroke="black" fill="none"/>
        <path d="M21 16L16 21M16 21H21M16 21V16" strokeWidth="2" stroke="black" fill="none"/>
      </g>
    )}
  </svg>
);

const CollapseIcon = ({ isCollapsed }) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="black">
    {isCollapsed ? (
      // Expand arrow (pointing down)
      <path d="M7 10l5 5 5-5z"/>
    ) : (
      // Collapse arrow (pointing up)
      <path d="M7 14l5-5 5 5z"/>
    )}
  </svg>
);

const NextIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="black">
    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
  </svg>
);

// Theme Display Names - Only approved themes
const THEME_DISPLAY_NAMES = {
  'endgame': 'End Game',
  'middlegame': 'Middle Game',
  'mate': 'Checkmate',
  'checkmate': 'Checkmate',
  'advantage': 'Advantage',
  'fork': 'Fork',
  'discoveredAttack': 'Discovered Attack',
  'pin': 'Pin',
  'skewer': 'Skewer',
  'opening': 'Openings',
  'sacrifice': 'Sacrifice',
  'defensiveMove': 'Defensive Move'
};

// Theme Selector Component - FIXED VERSION
const ThemeSelector = ({ 
  themes, 
  selectedTheme, 
  onThemeChange, 
  disabled = false 
}) => {
  const [showAllThemes, setShowAllThemes] = useState(false);

  // Get display name for theme
  const getThemeDisplayName = (theme) => {
    return THEME_DISPLAY_NAMES[theme] || theme.charAt(0).toUpperCase() + theme.slice(1);
  };

  // FIX: Add safety check for themes array
  if (!themes || !Array.isArray(themes)) {
    return null; // Or return a loading state
  }

  // Filter to only show approved themes and get top themes
  const approvedThemes = themes.filter(theme => THEME_DISPLAY_NAMES[theme.name]);
  const topThemes = approvedThemes
    .filter(theme => theme.count >= 5) // Only themes with 5+ puzzles
    .slice(0, 8); // Top 8 themes

  if (approvedThemes.length === 0) return null;

  return (
    <div style={{
      margin: '15px 0',
      padding: '12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '10px'
      }}>
        <label style={{
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#333'
        }}>
          🎯 Puzzle Themes
        </label>
        
        {approvedThemes.length > 8 && (
          <button
            onClick={() => setShowAllThemes(!showAllThemes)}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              border: '1px solid #ddd',
              backgroundColor: 'white',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {showAllThemes ? 'Show Less' : 'Show All'}
          </button>
        )}
      </div>

      <div style={{
        display: 'flex',
        gap: '6px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {/* All Themes Button */}
        <button
          onClick={() => onThemeChange('all')}
          disabled={disabled}
          style={{
            padding: '6px 12px',
            border: '2px solid',
            borderColor: selectedTheme === 'all' ? '#2196F3' : '#ddd',
            backgroundColor: selectedTheme === 'all' ? '#2196F3' : 'white',
            color: selectedTheme === 'all' ? 'white' : '#333',
            borderRadius: '16px',
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontSize: '12px',
            fontWeight: selectedTheme === 'all' ? 'bold' : 'normal',
            transition: 'all 0.2s ease',
            opacity: disabled ? 0.6 : 1
          }}
        >
          All Themes
        </button>

        {/* Popular Themes */}
        {(showAllThemes ? approvedThemes : topThemes).map(theme => {
          const isSelected = selectedTheme === theme.name;
          const displayName = getThemeDisplayName(theme.name);
          
          return (
            <button
              key={theme.name}
              onClick={() => onThemeChange(theme.name)}
              disabled={disabled}
              title={`${theme.count} puzzles`}
              style={{
                padding: '6px 12px',
                border: '2px solid',
                borderColor: isSelected ? '#4CAF50' : '#ddd',
                backgroundColor: isSelected ? '#4CAF50' : 'white',
                color: isSelected ? 'white' : '#333',
                borderRadius: '16px',
                cursor: disabled ? 'not-allowed' : 'pointer',
                fontSize: '12px',
                fontWeight: isSelected ? 'bold' : 'normal',
                transition: 'all 0.2s ease',
                opacity: disabled ? 0.6 : 1
              }}
            >
              {displayName}
              <span style={{
                fontSize: '10px',
                opacity: 0.7,
                marginLeft: '4px'
              }}>
                ({theme.count})
              </span>
            </button>
          );
        })}
      </div>

      {selectedTheme !== 'all' && (
        <div style={{
          textAlign: 'center',
          fontSize: '11px',
          color: '#666',
          marginTop: '8px'
        }}>
          Showing puzzles with "{getThemeDisplayName(selectedTheme)}" theme
        </div>
      )}
    </div>
  );
};

// Settings Container Component - FIXED VERSION
const SettingsContainer = ({ 
  // Difficulty props
  currentDifficulty,
  onDifficultyChange,
  // Theme props
  themes,
  selectedTheme,
  onThemeChange,
  // Speed and sequence props
  playSpeed, 
  onSpeedChange, 
  sequenceLength, 
  onSequenceLengthChange, 
  disabled = false 
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false); // Uncollapsed by default

  // Get display name for theme
  const getThemeDisplayName = (theme) => {
    return THEME_DISPLAY_NAMES[theme] || theme.charAt(0).toUpperCase() + theme.slice(1);
  };

  // FIX: Add safety check for themes array
  const safeThemes = themes || [];
  const approvedThemes = safeThemes.filter(theme => THEME_DISPLAY_NAMES[theme.name]);
  const topThemes = approvedThemes
    .filter(theme => theme.count >= 5) // Only themes with 5+ puzzles
    .slice(0, 8); // Top 8 themes

  const difficulties = [
    { value: 'beginner', label: 'Beginner', color: '#4CAF50' },
    { value: 'intermediate', label: 'Intermediate', color: '#FF9800' },
    { value: 'advanced', label: 'Advanced', color: '#f44336' },
    { value: 'expert', label: 'Expert', color: '#9C27B0' }
  ];

  return (
    <div style={{
      margin: '15px 0',
      padding: '12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: isCollapsed ? '0' : '16px',
        cursor: 'pointer'
      }}
      onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <label style={{
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#333',
          cursor: 'pointer'
        }}>
          ⚙️ Settings
        </label>
        
        <CollapseIcon isCollapsed={isCollapsed} />
      </div>

      {!isCollapsed && (
        <div>
          {/* Difficulty Selection */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              marginBottom: '10px',
              fontWeight: 'bold',
              fontSize: '13px',
              color: '#333'
            }}>
              🏆 Difficulty Level
            </label>
            
            <div style={{
              display: 'flex',
              gap: '8px',
              flexWrap: 'wrap',
              justifyContent: 'center'
            }}>
              {difficulties.map(diff => (
                <button
                  key={diff.value}
                  onClick={() => onDifficultyChange(diff.value)}
                  disabled={disabled}
                  style={{
                    padding: '6px 12px',
                    border: '2px solid',
                    borderColor: currentDifficulty === diff.value ? diff.color : '#ddd',
                    backgroundColor: currentDifficulty === diff.value ? diff.color : 'white',
                    color: currentDifficulty === diff.value ? 'white' : '#333',
                    borderRadius: '16px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: currentDifficulty === diff.value ? 'bold' : 'normal',
                    transition: 'all 0.3s ease',
                    opacity: disabled ? 0.6 : 1,
                    minWidth: '70px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {diff.label}
                </button>
              ))}
            </div>
            
            <div style={{
              textAlign: 'center',
              fontSize: '11px',
              color: '#666',
              marginTop: '8px'
            }}>
              Current: {difficulties.find(d => d.value === currentDifficulty)?.label || 'Intermediate'}
            </div>
          </div>

          {/* Theme Selection - Only show if themes are available */}
          {approvedThemes.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'block',
                marginBottom: '10px',
                fontWeight: 'bold',
                fontSize: '13px',
                color: '#333'
              }}>
                🎯 Puzzle Themes
              </label>
              
              <div style={{
                display: 'flex',
                gap: '6px',
                flexWrap: 'wrap',
                justifyContent: 'center'
              }}>
                {/* All Themes Button */}
                <button
                  onClick={() => onThemeChange('all')}
                  disabled={disabled}
                  style={{
                    padding: '6px 12px',
                    border: '2px solid',
                    borderColor: selectedTheme === 'all' ? '#2196F3' : '#ddd',
                    backgroundColor: selectedTheme === 'all' ? '#2196F3' : 'white',
                    color: selectedTheme === 'all' ? 'white' : '#333',
                    borderRadius: '16px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: selectedTheme === 'all' ? 'bold' : 'normal',
                    transition: 'all 0.2s ease',
                    opacity: disabled ? 0.6 : 1
                  }}
                >
                  All Themes
                </button>

                {/* Popular Themes */}
                {topThemes.map(theme => {
                  const isSelected = selectedTheme === theme.name;
                  const displayName = getThemeDisplayName(theme.name);
                  
                  return (
                    <button
                      key={theme.name}
                      onClick={() => onThemeChange(theme.name)}
                      disabled={disabled}
                      title={`${theme.count} puzzles`}
                      style={{
                        padding: '6px 12px',
                        border: '2px solid',
                        borderColor: isSelected ? '#4CAF50' : '#ddd',
                        backgroundColor: isSelected ? '#4CAF50' : 'white',
                        color: isSelected ? 'white' : '#333',
                        borderRadius: '16px',
                        cursor: disabled ? 'not-allowed' : 'pointer',
                        fontSize: '12px',
                        fontWeight: isSelected ? 'bold' : 'normal',
                        transition: 'all 0.2s ease',
                        opacity: disabled ? 0.6 : 1
                      }}
                    >
                      {displayName}
                      <span style={{
                        fontSize: '10px',
                        opacity: 0.7,
                        marginLeft: '4px'
                      }}>
                        ({theme.count})
                      </span>
                    </button>
                  );
                })}
              </div>

              {selectedTheme !== 'all' && (
                <div style={{
                  textAlign: 'center',
                  fontSize: '11px',
                  color: '#666',
                  marginTop: '8px'
                }}>
                  Showing puzzles with "{getThemeDisplayName(selectedTheme)}" theme
                </div>
              )}
            </div>
          )}

          {/* Speed Control */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 'bold',
              fontSize: '13px',
              color: '#333'
            }}>
              Move Speed
            </label>
            
            <input
              type="range"
              min="500"
              max="3000"
              step="250"
              value={3500 - playSpeed}
              onChange={(e) => onSpeedChange(3500 - Number(e.target.value))}
              disabled={disabled}
              style={{
                width: '100%',
                height: '4px',
                borderRadius: '2px',
                background: '#ddd',
                outline: 'none',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1
              }}
            />
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '10px',
              color: '#666',
              marginTop: '4px'
            }}>
              <span>Slow</span>
              <span>Fast</span>
            </div>
            
            <div style={{
              textAlign: 'center',
              fontSize: '12px',
              color: '#666',
              marginTop: '6px'
            }}>
              {playSpeed / 1000}s per move
            </div>
          </div>

          {/* Sequence Length Control */}
          <div style={{ marginBottom: '8px' }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px', 
              fontWeight: 'bold',
              fontSize: '13px',
              color: '#333'
            }}>
              Sequence Length
            </label>
            
            <div style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              {[4, 6, 8].map(length => (
                <button
                  key={length}
                  onClick={() => onSequenceLengthChange(length)}
                  disabled={disabled}
                  style={{
                    padding: '6px 12px',
                    border: '2px solid',
                    borderColor: sequenceLength === length ? '#4CAF50' : '#ddd',
                    backgroundColor: sequenceLength === length ? '#4CAF50' : 'white',
                    color: sequenceLength === length ? 'white' : '#333',
                    borderRadius: '12px',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontSize: '12px',
                    fontWeight: sequenceLength === length ? 'bold' : 'normal',
                    transition: 'all 0.2s ease',
                    minWidth: '36px',
                    opacity: disabled ? 0.6 : 1
                  }}
                >
                  {length}
                </button>
              ))}
            </div>
            
            <div style={{
              textAlign: 'center',
              fontSize: '11px',
              color: '#666',
              marginTop: '8px'
            }}>
              Watch {sequenceLength - 1} moves, play move {sequenceLength}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const FeedbackCard = ({ message, type = 'info' }) => {
  if (!message) return null;
  
  const colors = {
    success: { bg: '#d4edda', border: '#c3e6cb', text: '#155724' },
    error: { bg: '#f8d7da', border: '#f5c6cb', text: '#721c24' },
    info: { bg: '#d1ecf1', border: '#bee5eb', text: '#0c5460' },
    warning: { bg: '#fff3cd', border: '#ffeaa7', text: '#856404' }
  };
  
  const style = colors[type] || colors.info;
  
  return (
    <div style={{
      backgroundColor: style.bg,
      border: `2px solid ${style.border}`,
      color: style.text,
      padding: '15px 20px',
      borderRadius: '12px',
      margin: '15px auto',
      maxWidth: '600px',
      fontSize: '15px',
      fontWeight: '500',
      textAlign: 'justify',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      lineHeight: '1.4'
    }}>
      {message}
    </div>
  );
};

// Difficulty Toggle Component - Styled like themes menu
const DifficultyToggle = ({ currentDifficulty, onDifficultyChange, disabled }) => {
  const difficulties = [
    { value: 'beginner', label: 'Beginner', color: '#4CAF50' },
    { value: 'intermediate', label: 'Intermediate', color: '#FF9800' },
    { value: 'advanced', label: 'Advanced', color: '#f44336' },
    { value: 'expert', label: 'Expert', color: '#9C27B0' }
  ];

  return (
    <div style={{
      margin: '15px 0',
      padding: '12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '10px'
      }}>
        <label style={{
          fontSize: '14px',
          fontWeight: 'bold',
          color: '#333'
        }}>
          🏆 Difficulty Level
        </label>
      </div>

      <div style={{
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: '100%'
      }}>
        {difficulties.map(diff => (
          <button
            key={diff.value}
            onClick={() => onDifficultyChange(diff.value)}
            disabled={disabled}
            style={{
              padding: '6px 12px',
              border: '2px solid',
              borderColor: currentDifficulty === diff.value ? diff.color : '#ddd',
              backgroundColor: currentDifficulty === diff.value ? diff.color : 'white',
              color: currentDifficulty === diff.value ? 'white' : '#333',
              borderRadius: '16px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              fontSize: '12px',
              fontWeight: currentDifficulty === diff.value ? 'bold' : 'normal',
              transition: 'all 0.3s ease',
              opacity: disabled ? 0.6 : 1,
              minWidth: '70px',
              whiteSpace: 'nowrap'
            }}
          >
            {diff.label}
          </button>
        ))}
      </div>
      
      <div style={{
        textAlign: 'center',
        fontSize: '11px',
        color: '#666',
        marginTop: '8px'
      }}>
        Current: {difficulties.find(d => d.value === currentDifficulty)?.label || 'Intermediate'}
      </div>
    </div>
  );
};

const App = () => {
  // EXISTING STATE VARIABLES
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [boardPosition, setBoardPosition] = useState('');
  const [currentMove, setCurrentMove] = useState(null);
  const [highlightedSquares, setHighlightedSquares] = useState({});
  const [selectedSquares, setSelectedSquares] = useState([]);
  const [isUserTurnToMove, setIsUserTurnToMove] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackType, setFeedbackType] = useState('info');
  const [puzzlePhase, setPuzzlePhase] = useState('ready');
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(2250);
  const [sequenceLength, setSequenceLength] = useState(4);
  const [isExpanded, setIsExpanded] = useState(false);
  const [boardSize, setBoardSize] = useState(() => getBoardSize(false));
  const autoPlayRef = useRef(null);
  const internalGameRef = useRef(null);

  // USER SYSTEM STATE VARIABLES
  const [puzzles, setPuzzles] = useState([]);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [profileUpdateKey, setProfileUpdateKey] = useState(0);
  const [userSystem] = useState(() => new UserSystem());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [puzzleStartTime, setPuzzleStartTime] = useState(null);
  
  // PUZZLE ATTEMPT TRACKING
  const [puzzleAttempted, setPuzzleAttempted] = useState(false);
  const [hintUsed, setHintUsed] = useState(false);
  
  // LOADING STATES
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPuzzles, setIsLoadingPuzzles] = useState(false);
  
  // SESSION PERSISTENCE STATE
  const [selectedDifficulty, setSelectedDifficulty] = useState(() => {
    const savedSession = loadSessionData();
    return savedSession?.difficulty || 'intermediate';
  });

  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  
  // THEME SELECTION STATE
  const [selectedTheme, setSelectedTheme] = useState('all');
  const [availableThemes, setAvailableThemes] = useState([]);
  
  // BOARD ORIENTATION STATE
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [userPlayingAs, setUserPlayingAs] = useState('white');

  // Save session data when things change
  useEffect(() => {
    if (user && puzzles.length > 0) {
      saveSessionData({
        difficulty: selectedDifficulty,
        puzzleIndex: currentPuzzleIndex,
        userId: user.id
      });
    }
  }, [user, selectedDifficulty, currentPuzzleIndex, puzzles.length]);

  // AUTHENTICATION
  useEffect(() => {
    let subscription;
    
    const setupAuth = async () => {
      try {
        console.log('🔐 Setting up authentication...');
        
        const currentUser = await userSystem.getCurrentUser();
        console.log('👤 Current user:', currentUser?.id || 'none');
        setUser(currentUser);
        
        if (currentUser) {
          const profile = await userSystem.getUserProfile();
          console.log('📊 User profile loaded');
          setUserProfile(profile);
        }
        
        subscription = userSystem.onAuthStateChange(async (event, user) => {
          if (event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
            return;
          }
          
          console.log('🔄 Auth state changed:', event, user?.id || 'none');
          setUser(user);
          
          if (user) {
            const profile = await userSystem.getUserProfile();
            setUserProfile(profile);
          } else {
            setUserProfile(null);
          }
        });
        
      } catch (error) {
        console.error('❌ Auth setup error:', error);
      } finally {
        console.log('✅ Auth setup complete');
        setIsLoadingAuth(false);
      }
    };
    
    setupAuth();
    
    return () => {
      if (subscription && subscription.data && subscription.data.subscription) {
        subscription.data.subscription.unsubscribe();
      }
    };
  }, [userSystem]);

  // PUZZLE LOADING
  const loadPuzzles = useCallback(async () => {
    if (isLoadingAuth || isLoadingPuzzles) {
      return;
    }

    console.log('🐟 Loading puzzles:', selectedDifficulty, `${sequenceLength}-move`, 'theme:', selectedTheme, 'for user:', user?.id || 'guest');
    setIsLoadingPuzzles(true);
    
    try {
      let fetchedPuzzles = [];
      
      if (user) {
        fetchedPuzzles = await userSystem.getPuzzlesForUser(selectedDifficulty, 50, sequenceLength, selectedTheme);
      } else {
        fetchedPuzzles = await userSystem.getPublicPuzzles(selectedDifficulty, 25, sequenceLength, selectedTheme);
      }
      
      console.log('📦 Received puzzles:', fetchedPuzzles.length);
      
      if (fetchedPuzzles.length > 0) {
        setPuzzles(fetchedPuzzles);
        setCurrentPuzzleIndex(0);
        console.log(`✅ Ready! ${selectedDifficulty} ${sequenceLength}-move puzzles loaded`);
      } else {
        setFeedbackMessage(`Failed to load ${selectedDifficulty} ${sequenceLength}-move puzzles with theme "${selectedTheme}".`);
        setFeedbackType('error');
      }
      
    } catch (error) {
      console.error('❌ Failed to load puzzles:', error);
      setFeedbackMessage('Failed to load puzzles. Please refresh the page.');
      setFeedbackType('error');
    } finally {
      setIsLoadingPuzzles(false);
    }
  }, [isLoadingAuth, user, userSystem, selectedDifficulty, sequenceLength, selectedTheme, isLoadingPuzzles]);

  // Trigger puzzle loading
  const puzzleLoadTrigger = `${!isLoadingAuth}-${user?.id || 'guest'}-${selectedDifficulty}-${sequenceLength}-${selectedTheme}`;
  useEffect(() => {
    if (!isLoadingAuth) {
      loadPuzzles();
    }
  }, [puzzleLoadTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  // Load themes when difficulty/sequence changes
  useEffect(() => {
    const loadThemes = async () => {
      if (!isLoadingAuth && userSystem) {
        try {
          const themes = await userSystem.fetchPuzzleThemes(
            selectedDifficulty, 
            sequenceLength
          );
          setAvailableThemes(themes);
        } catch (error) {
          console.error('Failed to load themes:', error);
          setAvailableThemes([]);
        }
      }
    };
    
    loadThemes();
  }, [selectedDifficulty, sequenceLength, isLoadingAuth, userSystem]);

  // Update board size on resize and expansion toggle
  useEffect(() => {
    const handleResize = () => setBoardSize(getBoardSize(isExpanded));
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isExpanded]);

  // Handle board expansion toggle
  const toggleBoardExpansion = () => {
    setIsExpanded(!isExpanded);
    setBoardSize(getBoardSize(!isExpanded));
  };

  // Helper function to validate puzzle data
  const validatePuzzle = (puzzle) => {
    if (!puzzle.moves || puzzle.moves.length !== sequenceLength) {
      console.warn(`Puzzle does not have exactly ${sequenceLength} moves:`, puzzle);
      return false;
    }
    
    for (let i = 0; i < sequenceLength; i++) {
      const move = puzzle.moves[i];
      if (!move || move.length < 4) {
        console.warn(`Invalid move format at index ${i}:`, move);
        return false;
      }
    }
    
    return true;
  };

  // Helper function to get ordinal suffix (4th, 6th, 8th)
  const getOrdinalSuffix = (num) => {
    const suffixes = ['th', 'st', 'nd', 'rd'];
    const v = num % 100;
    return suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
  };

  // Helper function to get path squares between two positions
  const getPathSquares = (from, to) => {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const fromFile = files.indexOf(from[0]);
    const fromRank = parseInt(from[1]);
    const toFile = files.indexOf(to[0]);
    const toRank = parseInt(to[1]);
    
    const path = [];
    
    // Check if this is a knight move (L-shape: 2+1 or 1+2)
    const fileDiff = Math.abs(toFile - fromFile);
    const rankDiff = Math.abs(toRank - fromRank);
    const isKnightMove = (fileDiff === 2 && rankDiff === 1) || (fileDiff === 1 && rankDiff === 2);
    
    if (isKnightMove) {
      // Knight moves in L-shape: show the 4 squares (start, two intermediate, end)
      path.push(from);
      
      // Determine the L-shape path
      if (fileDiff === 2) {
        // Move 2 files first, then 1 rank
        const midFile = fromFile + Math.sign(toFile - fromFile);
        const midSquare1 = files[midFile] + fromRank;
        const midSquare2 = files[toFile] + fromRank;
        path.push(midSquare1, midSquare2);
      } else {
        // Move 1 file first, then 2 ranks
        const midSquare1 = files[toFile] + fromRank;
        const midRank = fromRank + Math.sign(toRank - fromRank);
        const midSquare2 = files[toFile] + midRank;
        path.push(midSquare1, midSquare2);
      }
      
      path.push(to);
    } else {
      // Regular piece movement (straight lines, diagonals)
      const dx = Math.sign(toFile - fromFile);
      const dy = Math.sign(toRank - fromRank);
      
      let currentFile = fromFile;
      let currentRank = fromRank;
      
      // Add starting square
      path.push(from);
      
      // Add intermediate squares
      while (currentFile !== toFile || currentRank !== toRank) {
        if (currentFile !== toFile) currentFile += dx;
        if (currentRank !== toRank) currentRank += dy;
        
        if (currentFile >= 0 && currentFile < 8 && currentRank >= 1 && currentRank <= 8) {
          const square = files[currentFile] + currentRank;
          if (square !== to) { // Don't add destination twice
            path.push(square);
          }
        }
      }
      
      // Add destination square
      path.push(to);
    }
    
    return path;
  };

  // Render SVG arrow for move visualization
  const renderMoveArrow = () => {
    if (!currentMove) return null;
    
    const { from, to } = currentMove;
    
    // Calculate arrow positions
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const fromFile = files.indexOf(from[0]);
    const fromRank = parseInt(from[1]);
    const toFile = files.indexOf(to[0]);
    const toRank = parseInt(to[1]);
    
    // Convert to pixel coordinates (assuming standard 8x8 grid)
    const squareSize = boardSize / 8;
    const fromX = (boardOrientation === 'white' ? fromFile : 7 - fromFile) * squareSize + squareSize / 2;
    const fromY = (boardOrientation === 'white' ? 8 - fromRank : fromRank - 1) * squareSize + squareSize / 2;
    const toX = (boardOrientation === 'white' ? toFile : 7 - toFile) * squareSize + squareSize / 2;
    const toY = (boardOrientation === 'white' ? 8 - toRank : toRank - 1) * squareSize + squareSize / 2;
    
    return (
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: boardSize,
          height: boardSize,
          pointerEvents: 'none',
          zIndex: 10
        }}
      >
        <svg
          width={boardSize}
          height={boardSize}
          style={{ position: 'absolute', top: 0, left: 0 }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8.4"
              markerHeight="5.6"
              refX="7.7"
              refY="2.8"
              orient="auto"
            >
              <polygon
                points="0 0, 8.4 2.8, 0 5.6"
                fill="#2196F3"
                stroke="#1976D2"
                strokeWidth="1"
              />
            </marker>
          </defs>
          <line
            x1={fromX}
            y1={fromY}
            x2={toX}
            y2={toY}
            stroke="#2196F3"
            strokeWidth="4"
            markerEnd="url(#arrowhead)"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  };

  // Reset puzzle function
  const resetCurrentPuzzle = useCallback((index) => {
    if (!puzzles || puzzles.length === 0 || !puzzles[index]) {
      return;
    }

    const puzzle = puzzles[index];
    
    if (!validatePuzzle(puzzle)) {
      setFeedbackMessage('This puzzle appears to be invalid. Loading new puzzles...');
      setFeedbackType('error');
      loadPuzzles();
      return;
    }

    const game = new Chess(puzzle.fen);
    
    // Determine who plays the final move
    const tempGame = new Chess(puzzle.fen);
    for (let i = 0; i < sequenceLength - 1; i++) {
      tempGame.move({ from: puzzle.moves[i].slice(0, 2), to: puzzle.moves[i].slice(2, 4) });
    }
    
    const userPlaysAs = tempGame.turn() === 'w' ? 'white' : 'black';
    setUserPlayingAs(userPlaysAs);
    setBoardOrientation(userPlaysAs);
    
    internalGameRef.current = game;
    setBoardPosition(puzzle.fen);
    setCurrentMoveIndex(0);
    setCurrentMove(null);
    setHighlightedSquares({});
    setSelectedSquares([]);
    setIsUserTurnToMove(false);
    setIsAutoPlaying(false);
    setPuzzlePhase('ready');
    setFeedbackMessage(`Click the play button to watch the first ${sequenceLength - 1} moves!`);
    setFeedbackType('info');
    
    // Reset puzzle tracking
    setPuzzleAttempted(false);
    setHintUsed(false);
    
    // Clear any running timers
    if (autoPlayRef.current) {
      clearTimeout(autoPlayRef.current);
    }
  }, [puzzles, loadPuzzles, sequenceLength]);

  // Reset puzzle when index changes
  useEffect(() => {
    if (puzzles.length > 0) {
      resetCurrentPuzzle(currentPuzzleIndex);
    }
  }, [currentPuzzleIndex, puzzles, resetCurrentPuzzle]);

  // AUTO-PLAY FUNCTIONALITY
  const startAutoPlay = () => {
    if (isAutoPlaying) return;
    
    // Allow replay even after sequence is complete
    if (puzzlePhase === 'complete' || puzzlePhase === 'playing') {
      // Reset to beginning for replay
      setBoardPosition(puzzles[currentPuzzleIndex].fen);
      setCurrentMoveIndex(0);
      setCurrentMove(null);
      setPuzzlePhase('watching');
      setIsUserTurnToMove(false);
    }
    
    setIsAutoPlaying(true);
    setPuzzlePhase('watching');
    setPuzzleStartTime(Date.now());
    setFeedbackMessage('Watch carefully and memorize these moves!');
    setFeedbackType('warning');
    
    // Start the sequence
    playMoveSequence(0);
  };

  const playMoveSequence = (moveIndex) => {
    if (moveIndex >= sequenceLength - 1) {
      // After all setup moves, set up for user's turn
      setupUserTurn();
      return;
    }

    const puzzle = puzzles[currentPuzzleIndex];
    const move = puzzle.moves[moveIndex];
    const from = move.slice(0, 2);
    const to = move.slice(2, 4);

    // Show move with arrow highlighting
    setCurrentMove({ from, to });
    setCurrentMoveIndex(moveIndex + 1);

    // Schedule next move
    autoPlayRef.current = setTimeout(() => {
      playMoveSequence(moveIndex + 1);
    }, playSpeed);
  };

  const setupUserTurn = () => {
    setIsAutoPlaying(false);
    setPuzzlePhase('playing');
    
    // Apply all setup moves to the game state
    const puzzle = puzzles[currentPuzzleIndex];
    const game = new Chess(puzzle.fen);
    
    const setupMoves = puzzle.moves.slice(0, sequenceLength - 1);
    
    for (let i = 0; i < setupMoves.length; i++) {
      const move = setupMoves[i];
      const moveResult = game.move({ from: move.slice(0, 2), to: move.slice(2, 4) });
      
      if (!moveResult) {
        setFeedbackMessage('This puzzle contains invalid moves. Please try another.');
        setFeedbackType('error');
        return;
      }
    }

    internalGameRef.current = game;
    setCurrentMove(null); // Clear highlighting
    setIsUserTurnToMove(true);
    setFeedbackMessage(`Recall the position after ${sequenceLength - 1} moves and play the best ${sequenceLength}${getOrdinalSuffix(sequenceLength)} move!`);
    setFeedbackType('info');
  };

  const pauseAutoPlay = () => {
    setIsAutoPlaying(false);
    if (autoPlayRef.current) {
      clearTimeout(autoPlayRef.current);
    }
  };

  const handleSquareClick = (square) => {
    if (!isUserTurnToMove) return;

    if (selectedSquares.length === 0) {
      setSelectedSquares([square]);
      setHighlightedSquares({
        [square]: { backgroundColor: 'rgba(173, 216, 230, 0.6)' }
      });
      setFeedbackMessage('Select the destination square of your move.');
      setFeedbackType('info');
    } else {
      const from = selectedSquares[0];
      const to = square;
      const userGuess = from + to;
      const correctMove = puzzles[currentPuzzleIndex].moves[sequenceLength - 1];

      setHighlightedSquares({
        [from]: { backgroundColor: 'rgba(173, 216, 230, 0.6)' },
        [to]: { backgroundColor: 'rgba(173, 216, 230, 0.6)' }
      });

      setTimeout(() => {
        setHighlightedSquares({});
        evaluateUserMove(from, to, userGuess, correctMove);
      }, 1000);

      setSelectedSquares([]);
    }
  };

  const evaluateUserMove = async (from, to, userGuess, correctMove) => {
    const tempGame = new Chess(internalGameRef.current.fen());
    const moveResult = tempGame.move({ from, to });

    if (!moveResult) {
      setFeedbackMessage('Illegal move.');
      setFeedbackType('error');
      return;
    }

    setIsUserTurnToMove(false);
    setPuzzlePhase('complete');
    setFeedbackMessage('Analyzing your move…');
    setFeedbackType('info');

    const timeTaken = puzzleStartTime ? Math.round((Date.now() - puzzleStartTime) / 1000) : null;
    const solved = userGuess === correctMove;
    const currentPuzzle = puzzles[currentPuzzleIndex];

    // Mark that user has attempted this puzzle
    setPuzzleAttempted(true);

    // Record attempt if user is logged in
    if (user && currentPuzzle.id) {
      try {
        // Determine if rating should change
        const shouldChangeRating = !puzzleAttempted && !hintUsed;
        
        const result = await userSystem.recordPuzzleAttempt(
          currentPuzzle.id,
          solved,
          timeTaken,
          [userGuess],
          shouldChangeRating // Pass flag to indicate if rating should change
        );
        
        if (result) {
          // Profile refresh
          setTimeout(async () => {
            const updatedProfile = await userSystem.getUserProfile();
            if (updatedProfile) {
              setUserProfile(updatedProfile);
              setProfileUpdateKey(prev => prev + 1);
            }
          }, 500);
          
          let feedbackText = solved ? 'Correct!' : 'Incorrect.';
          
          if (shouldChangeRating && result.ratingChange !== 0) {
            feedbackText += ` Rating: ${result.newRating} (${result.ratingChange >= 0 ? '+' : ''}${result.ratingChange})`;
          }
          
          setFeedbackMessage(feedbackText);
          setFeedbackType(solved ? 'success' : 'error');
        }
      } catch (error) {
        console.error('Failed to record attempt:', error);
      }
    } else if (!user) {
      if (solved) {
        setFeedbackMessage('Correct!');
        setFeedbackType('success');
      } else {
        setFeedbackMessage('Incorrect.');
        setFeedbackType('error');
      }
    }

    // Play all moves for visualization
    playFullSequence([...currentPuzzle.moves.slice(0, sequenceLength - 1), userGuess]);

    if (!solved) {
      try {
        const explanation = await getIncorrectMoveExplanation(
          currentPuzzle.fen,
          currentPuzzle.moves,
          userGuess,
          correctMove,
          userPlayingAs
        );
        
        setTimeout(() => {
          setFeedbackMessage(prev => prev + ' ' + explanation);
        }, 2000);
      } catch (err) {
        console.error('Failed to get explanation:', err);
      }
    }
  };

  const playFullSequence = (moves) => {
    const puzzle = puzzles[currentPuzzleIndex];
    const game = new Chess(puzzle.fen);
    setBoardPosition(puzzle.fen);
    setCurrentMove(null);

    moves.forEach((move, i) => {
      setTimeout(() => {
        const from = move.slice(0, 2);
        const to = move.slice(2, 4);
        const moveResult = game.move({ from, to });
        
        if (moveResult) {
          setBoardPosition(game.fen());
          setCurrentMove({ from, to });
        }
      }, i * 1000);
    });

    setTimeout(() => {
      setCurrentMove(null);
    }, moves.length * 1000 + 700);
  };

  const handleRevealSolution = async () => {
    const puzzle = puzzles[currentPuzzleIndex];
    
    setFeedbackMessage('Revealing solution...');
    setFeedbackType('info');
    
    // Play all moves
    playFullSequence(puzzle.moves);

    // Show explanation after sequence
    setTimeout(async () => {
      try {
        const explanation = await getCorrectMoveExplanation(puzzle, userSystem, userPlayingAs);
        setFeedbackMessage(`The solution is ${puzzle.moves[sequenceLength - 1]}.`);
        setFeedbackType('info');
      } catch (error) {
        setFeedbackMessage(`The solution is ${puzzle.moves[sequenceLength - 1]}.`);
        setFeedbackType('info');
      }
    }, puzzle.moves.length * 1000 + 300);
  };

  const handleHint = () => {
    const puzzle = puzzles[currentPuzzleIndex];
    const correctMove = puzzle.moves[sequenceLength - 1];
    const from = correctMove.slice(0, 2);
    
    // Mark that hint was used
    setHintUsed(true);
    
    setFeedbackMessage(`Hint: Look at the piece on ${from.toUpperCase()} (Note: Using hints prevents rating increases)`);
    setFeedbackType('warning');
    
    // Briefly highlight the piece that should move
    setHighlightedSquares({
      [from]: { backgroundColor: 'rgba(255, 193, 7, 0.6)' }
    });
    
    setTimeout(() => {
      setHighlightedSquares({});
    }, 3000);
  };

  const skipToNextPuzzle = () => {
    if (currentPuzzleIndex < puzzles.length - 1) {
      setCurrentPuzzleIndex(currentPuzzleIndex + 1);
    } else {
      loadPuzzles();
      setCurrentPuzzleIndex(0);
    }
  };

  const goToPreviousPuzzle = () => {
    if (currentPuzzleIndex > 0) {
      setCurrentPuzzleIndex(currentPuzzleIndex - 1);
    }
  };

  // Difficulty change handler
  const handleDifficultyChange = useCallback((newDifficulty) => {
    if (newDifficulty !== selectedDifficulty) {
      console.log('🔄 Changing difficulty to:', newDifficulty);
      setSelectedDifficulty(newDifficulty);
      setCurrentPuzzleIndex(0);
    }
  }, [selectedDifficulty]);

  // Theme change handler
  const handleThemeChange = useCallback((newTheme) => {
    if (newTheme !== selectedTheme) {
      console.log('🏷️ Changing theme to:', newTheme);
      setSelectedTheme(newTheme);
      setCurrentPuzzleIndex(0);
    }
  }, [selectedTheme]);

  // Auth handlers
  const handleAuthSuccess = async (user) => {
    setUser(user);
    const profile = await userSystem.getUserProfile();
    setUserProfile(profile);
    setProfileUpdateKey(prev => prev + 1);
    setShowAuthModal(false);
  };

  const handleSignOut = async () => {
    await userSystem.signOut();
    setUser(null);
    setUserProfile(null);
    setShowProfileModal(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  const iconButtonStyle = {
    width: '36px',
    height: '36px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    margin: '0 3px'
  };

  const disabledIconButtonStyle = {
    ...iconButtonStyle,
    cursor: 'not-allowed',
    opacity: 0.4
  };

  // Loading states
  if (isLoadingAuth) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>Setting up authentication...</h2>
      </div>
    );
  }

  if (isLoadingPuzzles) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>Loading Puzzles...</h2>
        <p>Difficulty: {selectedDifficulty}</p>
        <p>🧩 Preparing challenging visualization puzzles...</p>
      </div>
    );
  }

  if (puzzles.length === 0) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column'
      }}>
        <h2>Failed to Load Puzzles</h2>
        <p>Difficulty: {selectedDifficulty}</p>
        <button onClick={() => loadPuzzles()} style={iconButtonStyle}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div
      className="App"
      style={{
        paddingTop: '4px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative'
      }}
    >
      {/* Header Row with Logo and Profile */}
      <div style={{
        width: '100%',
        maxWidth: '800px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        marginBottom: '10px'
      }}>
        {/* Logo on the left */}
        <img
          src="/logo.png"
          alt="Visualize 3 Logo"
          style={{
            height: boardSize > 360 ? '80px' : '50px'
          }}
        />

        {/* Profile section on the right */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          {user ? (
            <div 
              onClick={() => setShowProfileModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                backgroundColor: 'rgba(255,255,255,0.9)',
                padding: '8px 12px',
                borderRadius: '20px',
                border: '1px solid #ddd',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(240,240,240,0.9)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.9)'}
            >
              <div style={{ fontSize: '0.9rem', color: '#666' }}>
                <strong>{userProfile?.display_name || 'Player'}</strong>
              </div>
              <div style={{
                backgroundColor: '#4CAF50',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '12px',
                fontSize: '0.8rem',
                fontWeight: 'bold'
              }}>
                {userProfile?.current_rating || 1200}
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowAuthModal(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                fontSize: '0.9rem',
                fontWeight: 'bold'
              }}
            >
              Sign In
            </button>
          )}
        </div>
      </div>

      <h1 style={{ fontSize: '22px', marginTop: '2px', marginBottom: '4px' }}>
        Chess Visualization Trainer
      </h1>
      <p
        style={{
          maxWidth: '600px',
          textAlign: 'center',
          marginBottom: '16px'
        }}
      >
        Strengthen your chess memory and tactical foresight. Watch the first three
        moves play out, then use your recall skills to find the best fourth move
        without any visual aids.
      </p>

      <DifficultyToggle 
        currentDifficulty={selectedDifficulty}
        onDifficultyChange={handleDifficultyChange}
        disabled={isLoadingPuzzles}
      />

      <ThemeSelector
        themes={availableThemes}
        selectedTheme={selectedTheme}
        onThemeChange={handleThemeChange}
        disabled={isLoadingPuzzles}
      />

      <SettingsContainer
        currentDifficulty={selectedDifficulty}
        onDifficultyChange={handleDifficultyChange}
        themes={availableThemes}
        selectedTheme={selectedTheme}
        onThemeChange={handleThemeChange}
        playSpeed={playSpeed}
        onSpeedChange={setPlaySpeed}
        sequenceLength={sequenceLength}
        onSequenceLengthChange={setSequenceLength}
        disabled={isLoadingPuzzles}
      />

      <FeedbackCard 
        message={feedbackMessage}
        type={feedbackType} 
      />

      {userPlayingAs && (
        <p style={{ 
          fontWeight: 'bold', 
          margin: '5px 0 15px 0',
          color: userPlayingAs === 'white' ? '#333' : '#000',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          Playing as {userPlayingAs === 'white' ? 'White' : 'Black'}
        </p>
      )}

      <div style={{ position: 'relative', width: boardSize, height: boardSize }}>
        <Chessboard
          position={boardPosition}
          onSquareClick={handleSquareClick}
          boardWidth={boardSize}
          boardOrientation={boardOrientation}
          arePiecesDraggable={false}
          customSquareStyles={highlightedSquares}
          customDarkSquareStyle={{ backgroundColor: '#4caf50' }}
          customLightSquareStyle={{ backgroundColor: '#f1f1e6' }}
        />
        {renderMoveArrow()}
      </div>

      {/* Icon Button Controls */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        marginTop: '20px',
        marginBottom: '20px'
      }}>
        {/* Previous Puzzle */}
        <button 
          style={currentPuzzleIndex > 0 ? iconButtonStyle : disabledIconButtonStyle}
          onClick={goToPreviousPuzzle}
          disabled={currentPuzzleIndex === 0}
          title="Previous Puzzle"
        >
          <PrevIcon />
        </button>

        {/* Play/Pause Button - Now always available for replay */}
        <button 
          style={iconButtonStyle}
          onClick={isAutoPlaying ? pauseAutoPlay : startAutoPlay}
          title={isAutoPlaying ? "Pause" : puzzlePhase === 'ready' ? "Watch Moves 1-3" : "Replay Sequence"}
        >
          <PlayIcon isPlaying={isAutoPlaying} />
        </button>

        {/* Expand Board Button */}
        <button 
          style={iconButtonStyle}
          onClick={toggleBoardExpansion}
          title={isExpanded ? "Normal Size" : "Expand Board"}
        >
          <ExpandIcon isExpanded={isExpanded} />
        </button>

        {/* Hint Button */}
        <button 
          style={puzzlePhase === 'playing' ? iconButtonStyle : disabledIconButtonStyle}
          onClick={handleHint}
          disabled={puzzlePhase !== 'playing'}
          title="Hint"
        >
          <HintIcon />
        </button>

        {/* Reveal Solution Button */}
        <button 
          style={puzzlePhase === 'playing' || puzzlePhase === 'complete' ? iconButtonStyle : disabledIconButtonStyle}
          onClick={handleRevealSolution}
          disabled={puzzlePhase !== 'playing' && puzzlePhase !== 'complete'}
          title="Reveal Solution"
        >
          <RevealIcon />
        </button>

        {/* Next Puzzle */}
        <button 
          style={iconButtonStyle}
          onClick={skipToNextPuzzle}
          title="Next Puzzle"
        >
          <NextIcon />
        </button>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onAuthSuccess={handleAuthSuccess}
        userSystem={userSystem}
      />

      <UserProfile
        isOpen={showProfileModal}
        user={user}
        profile={userProfile}
        onSignOut={handleSignOut}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
};

export default App;
