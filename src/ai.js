// src/ai.js

/**
 * Calls our Vercel serverless function at /api/getExplanation.
 * Expects to POST { fen, userMove, correctMove, playingAs } and receive JSON { explanation }.
 *
 * @param {string} fen         – the FEN string after move 3
 * @param {string} userMove    – user's guessed fourth move (e.g. "b1c3")
 * @param {string} correctMove – correct fourth move (e.g. "g1f3")
 * @param {string} playingAs   – which color the user is playing ('white' or 'black')
 * @returns {Promise<string>}   – explanation returned by our serverless function
 */
export async function getIncorrectMoveExplanation(fen, userMove, correctMove, playingAs = 'white') {
  try {
    const response = await fetch('/api/getExplanation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fen, userMove, correctMove, playingAs }),
    });

    if (!response.ok) {
      const errorJson = await response.json();
      throw new Error(errorJson.error || 'Failed to fetch explanation');
    }

    const data = await response.json();
    return data.explanation;
  } catch (error) {
    console.error('Error calling /api/getExplanation:', error);
    return 'That move is suboptimal. Try to avoid losing material or weakening your position.';
  }
}
