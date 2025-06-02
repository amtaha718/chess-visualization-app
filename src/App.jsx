// src/App.js

import React, { useState, useRef, useEffect } from 'react';
import { Chess } from 'chess.js';
import { Chessboard } from 'react-chessboard';
import { getIncorrectMoveExplanation } from './ai';
import './index.css';
import UserSystem from './user-system';
import { AuthModal, UserProfile, AuthHeader } from './auth-components';

const getBoardSize = () => (window.innerWidth < 500 ? window.innerWidth - 40 : 400);

// FALLBACK PUZZLES (your working puzzles with added solved/attempted properties)
const FALLBACK_PUZZLES = [
{
fen: 'r1bqkbnr/ppp2ppp/2n5/1B1pp3/3PP3/5N2/PPP2PPP/RNBQK2R w KQkq - 0 4',
moves: ['e4d5', 'd8d5', 'b1c3', 'd5a5'],
explanation:
'This sequence helps White develop quickly and gain tempo by targeting the black queen with Nc3, forcing her to a passive square.',
solved: false,
attempted: false
},
{
fen: 'r1bqkbnr/pp3ppp/2n1p3/2pp4/3PP3/2N2N2/PPP2PPP/R1BQKB1R w KQkq - 0 5',
moves: ['e4d5', 'e6d5', 'f1b5', 'g8f6'],
explanation:
'White exchanges center pawns and develops the bishop to b5, pinning the knight and building pressure on Blacks position.',
solved: false,
attempted: false
},
{
fen: 'rnbqkb1r/pp1ppppp/5n2/2p5/2P5/5NP1/PP1PPP1P/RNBQKB1R w KQkq - 0 3',
moves: ['f1g2', 'b8c6', 'd2d4', 'c5d4'],
explanation:
'White aims for kingside fianchetto and central control. Playing d4 strikes at the center to open lines and challenge Blacks setup.',
solved: false,
attempted: false
},
{
fen: 'r1bqk1nr/pppp1ppp/2n5/4p3/1b1PP3/5N2/PPPN1PPP/R1BQKB1R w KQkq - 0 4',
moves: ['d4e5', 'c6e5', 'f3e5', 'd7d6'],
explanation:
'By capturing and recapturing in the center, White opens lines and clarifies central tension, with Ne5 aiming to provoke weaknesses or exchanges.',
solved: false,
attempted: false
},
{
fen: 'r2qkbnr/ppp2ppp/2n1b3/3p4/3P4/2P2N2/PP2PPPP/RNBQKB1R w KQkq - 2 5',
moves: ['c1g5', 'f8e7', 'g5e7', 'c6e7'],
explanation:
'White trades bishop for bishop to remove a key defender and weaken Blacks kingside control, preparing to develop quickly.',
solved: false,
attempted: false
},
{
fen: 'rnbqkb1r/pp3ppp/2p1pn2/3p4/3P4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 5',
moves: ['f1d3', 'f8d6', 'e3e4', 'd5e4'],
explanation:
'White builds up with classical development and prepares a central break. The e4 push is thematic, challenging Blacks center directly.',
solved: false,
attempted: false
},
{
fen: 'rnbqkbnr/pp3ppp/4p3/2ppP3/8/5N2/PPPPPPPP/RNBQKB1R w KQkq - 0 4',
moves: ['d2d4', 'c5d4', 'c2c3', 'd4c3'],
explanation:
'White strikes at the center with d4, and after the exchange, recaptures with the c-pawn to maintain central control and open lines for development.',
solved: false,
attempted: false
},
{
fen: 'r1bq1rk1/pppp1ppp/2n2n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQ1RK1 w - - 0 6',
moves: ['c1g5', 'h7h6', 'g5f6', 'd8f6'],
explanation:
'White pressures the kingside with Bg5, and when Black plays h6, captures the knight on f6 to damage Blacks kingside pawn structure and gain the bishop pair.',
solved: false,
attempted: false
},
{
fen: 'r1bq1rk1/ppp2ppp/2n2n2/3p4/3P4/2N2N2/PPP2PPP/R1BQKB1R w KQ - 0 8',
moves: ['c1g5', 'h7h6', 'g5f6', 'd8f6'],
explanation:
'White develops the bishop with tempo, attacking the knight. After Black plays h6, White captures the knight to damage the kingside pawn structure and maintain the initiative.',
solved: false,
attempted: false
},
{
fen: 'r1bqkb1r/pp2pppp/2n2n2/2pp4/3P4/2N1PN2/PP3PPP/R1BQKB1R w KQkq - 0 5',
moves: ['f1d3', 'c8g4', 'd1b3', 'c5c4'],
explanation:
'White develops with threats while preparing queenside pressure. Black responds by gaining space with ...c4 to blunt the b3 queens scope.',
solved: false,
attempted: false
}
];

const getSquareCoordinates = (square, boardSize) => {
const file = square.charCodeAt(0) - 'a'.charCodeAt(0);
const rank = 8 - parseInt(square[1], 10);
const squareSize = boardSize / 8;
return {
x: file * squareSize + squareSize / 2,
y: rank * squareSize + squareSize / 2
};
};

const App = () => {
// EXISTING STATE VARIABLES
const [boardSize, setBoardSize] = useState(getBoardSize());
const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
const [boardPosition, setBoardPosition] = useState('');
const [arrows, setArrows] = useState([]);
const [highlightedSquares, setHighlightedSquares] = useState({});
const [selectedSquares, setSelectedSquares] = useState([]);
const [isUserTurnToMove, setIsUserTurnToMove] = useState(false);
const [feedbackMessage, setFeedbackMessage] = useState('');
const internalGameRef = useRef(null);

// NEW USER SYSTEM STATE VARIABLES
const [puzzles, setPuzzles] = useState([]);
const [isLoadingPuzzles, setIsLoadingPuzzles] = useState(true);
const [user, setUser] = useState(null);
const [userProfile, setUserProfile] = useState(null);
const [userSystem] = useState(() => new UserSystem());
const [showAuthModal, setShowAuthModal] = useState(false);
const [showProfileModal, setShowProfileModal] = useState(false);
  console.log('🔍 Current showProfileModal state:', showProfileModal);
const [isLoadingAuth, setIsLoadingAuth] = useState(true);
const [puzzleStartTime, setPuzzleStartTime] = useState(null);

// AUTHENTICATION USEEFFECT - FIXED VERSION
useEffect(() => {
  let subscription;
  
  const setupAuth = async () => {
    try {
      // Get current user first
      const currentUser = await userSystem.getCurrentUser();
      setUser(currentUser);
      
      if (currentUser) {
        const profile = await userSystem.getUserProfile();
        setUserProfile(profile);
      }
      
      // Set up auth state listener
      subscription = userSystem.onAuthStateChange(async (event, user) => {
        setUser(user);
        
        if (user) {
          const profile = await userSystem.getUserProfile();
          setUserProfile(profile);
        } else {
          setUserProfile(null);
        }
      });
      
    } catch (error) {
      console.error('Auth setup error:', error);
    } finally {
      setIsLoadingAuth(false);
    }
  };
  
  setupAuth();
  
  // Cleanup function
  return () => {
    if (subscription && subscription.data && subscription.data.subscription) {
      subscription.data.subscription.unsubscribe();
    }
  };
}, [userSystem]);

// PUZZLE LOADING USEEFFECT
useEffect(() => {
  async function loadPuzzles() {
    try {
      console.log('Loading puzzles...');
      
      if (user) {
        // Get puzzles with user progress if logged in
        const fetchedPuzzles = await userSystem.getPuzzlesForUser('all', 20);
        if (fetchedPuzzles.length > 0) {
          setPuzzles(fetchedPuzzles);
          console.log(`✅ Loaded ${fetchedPuzzles.length} puzzles`);
          return;
        }
      }
      
      // Fallback to your original working puzzles
      console.log('Using fallback puzzles');
      setPuzzles(FALLBACK_PUZZLES);
      
    } catch (error) {
      console.error('Failed to load puzzles:', error);
      setPuzzles(FALLBACK_PUZZLES);
    } finally {
      setIsLoadingPuzzles(false);
    }
  }

  // Only load puzzles after auth state is determined
  if (!isLoadingAuth) {
    loadPuzzles();
  }
}, [isLoadingAuth, user, userSystem]);

// Update board size on resize
useEffect(() => {
const handleResize = () => setBoardSize(getBoardSize());
window.addEventListener('resize', handleResize);
return () => window.removeEventListener('resize', handleResize);
}, []);

// Whenever puzzle changes, reset state
useEffect(() => {
if (puzzles.length > 0) {
  resetCurrentPuzzle(currentPuzzleIndex);
}
}, [currentPuzzleIndex, puzzles]);

// RESET FUNCTION with safety check
const resetCurrentPuzzle = (index) => {
if (!puzzles || puzzles.length === 0 || !puzzles[index]) {
  console.log('No puzzles available yet');
  return;
}

const puzzle = puzzles[index];
internalGameRef.current = new Chess(puzzle.fen);
setBoardPosition(puzzle.fen);
setCurrentMoveIndex(0);
setArrows([]);
setHighlightedSquares({});
setSelectedSquares([]);
setIsUserTurnToMove(false);
setFeedbackMessage('');
};

// ENHANCED HANDLESHOWMOVE
const handleShowMove = () => {
if (currentMoveIndex === 0) setPuzzleStartTime(Date.now());

const move = puzzles[currentPuzzleIndex].moves[currentMoveIndex];
const from = move.slice(0, 2);
const to = move.slice(2, 4);

setArrows([{ from, to }]);

if (currentMoveIndex < 2) {
setCurrentMoveIndex((i) => i + 1);
} else {
const puzzle = puzzles[currentPuzzleIndex];
const game = new Chess(puzzle.fen);
const move1 = puzzle.moves[0];
const move2 = puzzle.moves[1];

game.move({ from: move1.slice(0, 2), to: move1.slice(2, 4) });
game.move({ from: move2.slice(0, 2), to: move2.slice(2, 4) });

console.log('Move 1 being applied:', move1);
console.log('Move 2 being applied:', move2);
console.log('Game history after moves 1&2:', game.history());

internalGameRef.current = game;
console.log('After applying moves 1&2:', game.fen());
console.log('Available moves after 1&2:', game.moves());

setIsUserTurnToMove(true);
setFeedbackMessage(
'Recall moves 1 and 2 in your mind—then choose the squares for the strongest move 3.'
);
setArrows([]);
}
};

// EXISTING HANDLESQUARECLICK - unchanged
const handleSquareClick = (square) => {
if (!isUserTurnToMove) return;

if (selectedSquares.length === 0) {
setSelectedSquares([square]);
setHighlightedSquares({
[square]: { backgroundColor: 'rgba(173, 216, 230, 0.6)' }
});
setFeedbackMessage('Select the destination square of your move.');
} else {
const from = selectedSquares[0];
const to = square;
const userGuess = from + to;
const correctMove = puzzles[currentPuzzleIndex].moves[2];

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

// ENHANCED EVALUATEUSERMOVE
const evaluateUserMove = async (from, to, userGuess, correctMove) => {
console.log('Current FEN:', internalGameRef.current.fen());
console.log('Attempting move from', from, 'to', to);
console.log('Available moves:', internalGameRef.current.moves());
console.log('User guess as coordinate:', userGuess);
console.log('from square:', from, 'to square:', to);

const tempGame = new Chess(internalGameRef.current.fen());
const moveResult = tempGame.move({ from, to });
console.log('Chess.js move result:', moveResult);

if (!moveResult) {
setFeedbackMessage('Illegal move.');
return;
}

setIsUserTurnToMove(false);
setFeedbackMessage('Analyzing your move…');

const timeTaken = puzzleStartTime ? Math.round((Date.now() - puzzleStartTime) / 1000) : null;
const solved = userGuess === correctMove;

// Record attempt if user is logged in
if (user && puzzles[currentPuzzleIndex].id) {
  try {
    const result = await userSystem.recordPuzzleAttempt(
      puzzles[currentPuzzleIndex].id,
      solved,
      timeTaken,
      [userGuess]
    );
    
    if (result && solved) {
      const updatedProfile = await userSystem.getUserProfile();
      setUserProfile(updatedProfile);
      
      const ratingChange = result.ratingChange;
      const ratingText = ratingChange > 0 ? `(+${ratingChange})` : `(${ratingChange})`;
      setFeedbackMessage(`Correct! Rating: ${result.newRating} ${ratingText}. ${puzzles[currentPuzzleIndex].explanation}`);
    }
  } catch (error) {
    console.error('Failed to record attempt:', error);
  }
}

const sequence = [
puzzles[currentPuzzleIndex].moves[0],
puzzles[currentPuzzleIndex].moves[1],
userGuess
];
playMoveSequence(sequence, solved);

if (!solved) {
try {
const explanation = await getIncorrectMoveExplanation(
internalGameRef.current.fen(),
userGuess,
correctMove
);
setFeedbackMessage(`Incorrect. ${explanation}`);
} catch (err) {
console.error(err);
setFeedbackMessage(
'Incorrect. (Failed to fetch explanation; try again.)'
);
}
} else if (!user) {
setFeedbackMessage(`Correct! ${puzzles[currentPuzzleIndex].explanation}`);
}
};

// EXISTING PLAYMOVESEQUENCE - unchanged
const playMoveSequence = (moves, isCorrect) => {
const puzzle = puzzles[currentPuzzleIndex];
const game = new Chess(puzzle.fen);
setBoardPosition(puzzle.fen);
setArrows([]);

moves.forEach((move, i) => {
setTimeout(() => {
const from = move.slice(0, 2);
const to = move.slice(2, 4);
game.move({ from, to });
setBoardPosition(game.fen());
setArrows([{ from, to }]);
}, i * 1000);
});

setTimeout(() => {
if (isCorrect) {
setFeedbackMessage(`Correct! ${puzzle.explanation}`);
}
setTimeout(() => setArrows([]), 700);
}, moves.length * 1000 + 300);
};

// EXISTING HANDLEREVEALSOLUTION - unchanged
const handleRevealSolution = () => {
const puzzle = puzzles[currentPuzzleIndex];
playMoveSequence(puzzle.moves, true);
};

// AUTH HANDLER FUNCTIONS
const handleAuthSuccess = async (user) => {
  setUser(user);
  const profile = await userSystem.getUserProfile();
  setUserProfile(profile);
  setShowAuthModal(false);
  
  const userPuzzles = await userSystem.getPuzzlesForUser('all', 20);
  if (userPuzzles.length > 0) {
    setPuzzles(userPuzzles);
  }
};

const handleSignOut = async () => {
  await userSystem.signOut();
  setUser(null);
  setUserProfile(null);
  setShowProfileModal(false);
  
  setPuzzles(FALLBACK_PUZZLES);
};

// EXISTING STYLES - unchanged
const buttonStyle = {
margin: '5px',
padding: '8px 16px',
fontSize: '14px',
border: 'none',
borderRadius: '8px',
backgroundColor: '#4CAF50',
color: 'white',
cursor: 'pointer',
boxShadow: '2px 2px 6px rgba(0,0,0,0.2)',
transition: 'background-color 0.3s ease'
};

// EXISTING RENDERARROWS - unchanged
const renderArrows = () => (
<svg
width={boardSize}
height={boardSize}
style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
>
<defs>
<marker
id="arrowhead"
markerWidth="5"
markerHeight="3.5"
refX="5"
refY="1.75"
orient="auto"
>
<polygon points="0 0, 5 1.75, 0 3.5" fill="rgba(30, 144, 255, 0.7)" />
</marker>
</defs>
{arrows.map(({ from, to }, i) => {
const start = getSquareCoordinates(from, boardSize);
const end = getSquareCoordinates(to, boardSize);
return (
<line
key={i}
x1={start.x}
y1={start.y}
x2={end.x}
y2={end.y}
stroke="rgba(30, 144, 255, 0.7)"
strokeWidth="5"
markerEnd="url(#arrowhead)"
/>
);
})}
</svg>
);

// LOADING STATE CHECK
if (isLoadingPuzzles || isLoadingAuth) {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column'
    }}>
      <h2>Loading Chess Puzzles...</h2>
      <p>Setting up your personalized experience...</p>
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
{/* Add this debug line right before AuthHeader */}
{console.log('🔍 AuthHeader props detailed:', { 
  hasUser: !!user, 
  userEmail: user?.email, 
  hasProfile: !!userProfile, 
  profileName: userProfile?.display_name 
})}}

<AuthHeader
  user={user}
  profile={userProfile}
  onShowAuth={() => {
    console.log('🔍 Sign In button clicked!');
    setShowAuthModal(true);
  }}
  onShowProfile={() => {
    console.log('🔍 Profile button clicked! Setting modal to true');
    setShowProfileModal(true);
    console.log('🔍 Modal state should now be true');
  }}
  onSignOut={handleSignOut}
/>

{/* TEST BUTTON */}
{user && (
  <button 
    onClick={() => {
      console.log('🔍 TEST: Profile button clicked!');
      setShowProfileModal(true);
    }}
    style={{
      position: 'absolute',
      top: '60px',
      right: '10px',
      backgroundColor: 'red',
      color: 'white',
      padding: '10px',
      border: 'none',
      borderRadius: '5px',
      zIndex: 200
    }}
  >
    TEST PROFILE
  </button>
)}

<img
src="/logo.png"
alt="Visualize 3 Logo"
style={{
height: boardSize > 360 ? '100px' : '60px',
marginTop: '2px',
marginBottom: '2px'
}}
/>
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
Strengthen your chess memory and tactical foresight. Watch the first two
moves play out, then use your recall skills to find the best third move
without any visual aids.
</p>
<p>
  Puzzle {currentPuzzleIndex + 1} of {puzzles.length}
  {puzzles[currentPuzzleIndex]?.solved && (
    <span style={{ color: '#4CAF50', marginLeft: '10px' }}>✓ Solved</span>
  )}
  {puzzles[currentPuzzleIndex]?.attempted && !puzzles[currentPuzzleIndex]?.solved && (
    <span style={{ color: '#FF9800', marginLeft: '10px' }}>⚬ Attempted</span>
  )}
</p>
<div style={{ position: 'relative', width: boardSize, height: boardSize }}>
<Chessboard
position={boardPosition}
onSquareClick={handleSquareClick}
boardWidth={boardSize}
arePiecesDraggable={false}
customSquareStyles={highlightedSquares}
customDarkSquareStyle={{ backgroundColor: '#4caf50' }}
customLightSquareStyle={{ backgroundColor: '#f1f1e6' }}
/>
{renderArrows()}
</div>
<p style={{ 
maxWidth: '600px', 
textAlign: 'center', 
wordWrap: 'break-word',
padding: '0 10px'
}}>
{feedbackMessage}
</p>
<div
style={{
marginTop: 10,
display: 'flex',
flexDirection: 'column',
alignItems: 'center',
gap: '10px'
}}
>
<div style={{
display: 'flex',
flexWrap: 'wrap',
justifyContent: 'center',
gap: '5px'
}}>
<button style={buttonStyle} onClick={handleShowMove}>
{currentMoveIndex < 2 ? `Show Move ${currentMoveIndex + 1}` : 'Your Move'}
</button>
<button style={buttonStyle} onClick={() => resetCurrentPuzzle(currentPuzzleIndex)}>
Replay
</button>
<button style={buttonStyle} onClick={handleRevealSolution}>
Reveal Solution
</button>
</div>

<div style={{
display: 'flex',
justifyContent: 'center',
gap: '5px'
}}>
<button
style={buttonStyle}
onClick={() =>
setCurrentPuzzleIndex((i) => (i - 1 + puzzles.length) % puzzles.length)
}
>
Previous Puzzle
</button>
<button
style={buttonStyle}
onClick={() => setCurrentPuzzleIndex((i) => (i + 1) % puzzles.length)}
>
Next Puzzle
</button>
</div>
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
  onClose={() => {
    console.log('🔍 Close button clicked! Current modal state:', showProfileModal);
    setShowProfileModal(false);
    console.log('🔍 Modal should now be closed');
  }}
/>

export default App;
