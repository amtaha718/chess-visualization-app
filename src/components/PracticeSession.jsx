// src/components/PracticeSession.jsx
const PracticeSession = ({ 
  opening, 
  variation, 
  gameState, 
  onMove, 
  feedback, 
  currentRound,
  userProgress,
  onExit 
}) => {
  const [boardOrientation, setBoardOrientation] = useState('white');
  const [moveHistory, setMoveHistory] = useState([]);

  return (
    <div className="practice-session">
      <div className="practice-header">
        <div className="opening-info">
          <h2>{opening.name}</h2>
          <h3>{variation.variation_name}</h3>
          <span className="eco-code">{opening.eco_code}</span>
        </div>
        
        <div className="practice-stats">
          <div className="round-indicator">
            Round {currentRound}/7
          </div>
          <div className="depth-indicator">
            Depth: {userProgress?.current_move_depth || 6} moves
          </div>
          <button onClick={onExit} className="exit-btn">
            Exit Course
          </button>
        </div>
      </div>

      <div className="practice-content">
        <div className="board-section">
          <Chessboard
            position={gameState.fen()}
            onPieceDrop={onMove}
            boardOrientation={boardOrientation}
            boardWidth={400}
          />
          
          <div className="board-controls">
            <button 
              onClick={() => setBoardOrientation(
                boardOrientation === 'white' ? 'black' : 'white'
              )}
            >
              Flip Board
            </button>
          </div>
        </div>

        <div className="practice-sidebar">
          <div className="feedback-section">
            <h4>Feedback</h4>
            <p className="feedback-message">{feedback}</p>
          </div>

          <div className="sequence-progress">
            <h4>Move Sequence</h4>
            <div className="moves-list">
              {variation.moves.slice(0, userProgress?.current_move_depth || 6)
                .map((move, index) => (
                <div 
                  key={index}
                  className={`move-item ${
                    index < moveHistory.length ? 'completed' : 'pending'
                  }`}
                >
                  {index + 1}. {move}
                </div>
              ))}
            </div>
          </div>

          <div className="key-ideas">
            <h4>Key Ideas</h4>
            <ul>
              {variation.key_ideas.map((idea, index) => (
                <li key={index}>{idea}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
