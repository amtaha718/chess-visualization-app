// api/getExplanation.js

import OpenAI from 'openai';

/**
 * A Vercel Serverless Function that returns explanations for chess moves.
 * Can handle both incorrect move explanations and correct move explanations.
 *
 * Expects a POST request with JSON body:
 *   { 
 *     originalFen: string,      // Starting position
 *     moves: string[],          // Array of 4 moves
 *     userMove: string,         // User's attempted move 4
 *     correctMove: string,      // The correct move 4
 *     playingAs: string,        // 'white' or 'black'
 *     isCorrect: boolean        // true for correct answer explanation
 *   }
 *
 * Returns JSON: { explanation: string } on success,
 * or { error: '...' } with HTTP 4xx/5xx on failure.
 */
export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // Extract parameters from request body
  const { originalFen, moves, userMove, correctMove, playingAs = 'white', isCorrect = false } = req.body;
  
  if (!originalFen || !moves || !correctMove) {
    return res.status(400).json({
      error: 'Missing required fields: originalFen, moves, correctMove',
    });
  }

  // Read the secret key from environment
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('OPENAI_API_KEY is not set in environment');
    return res
      .status(500)
      .json({ error: 'Server misconfiguration: missing API key' });
  }

  // Initialize the OpenAI client
  const openai = new OpenAI({ apiKey });

  let prompt;
  
  if (isCorrect) {
    // Generate explanation for correct answer - SHORTENED
    prompt = `
You are a chess coach analyzing a tactical puzzle. Here's the puzzle:

Starting position (FEN): ${originalFen}
Moves played:
1. ${moves[0]} (opponent's move that creates the tactical opportunity)
2. ${moves[1]} (first correct move by ${playingAs === 'white' ? 'White' : 'Black'})
3. ${moves[2]} (opponent's response)
4. ${moves[3]} (the winning move by ${playingAs === 'white' ? 'White' : 'Black'})

Explain in exactly 1-2 short sentences why this move sequence wins. Focus on the main tactical theme (fork, pin, discovered attack, etc.) and the key advantage gained.

Keep it concise and clear.
`.trim();
  } else {
    // Generate explanation for incorrect answer
    prompt = `
You are a strong chess coach analyzing a tactical puzzle. 

STEP 1: Analyze the position after 3 moves
Starting position (FEN): ${originalFen}
After playing these 3 moves in sequence:
1. ${moves[0]} 
2. ${moves[1]} 
3. ${moves[2]}

STEP 2: Evaluate the student's move
The student (playing as ${playingAs === 'white' ? 'White' : 'Black'}) tried: ${userMove}

CRITICAL INSTRUCTIONS:
- First, mentally play through moves 1-3 from the starting position to understand the current board
- Then analyze what happens after the student plays ${userMove}
- Focus on immediate tactical threats or material loss that ${userMove} allows
- Be specific about which pieces can attack what after ${userMove}
- Do NOT mention pieces that aren't on the board
- Do NOT reveal the correct move
- Do NOT start with "Incorrect"

Good example explanations:
- "This move hangs your bishop to the enemy knight."
- "Playing this allows the opponent's queen to fork your king and bishop."
- "This move permits a back-rank mate threat."

Write exactly 1-2 sentences explaining why ${userMove} is tactically weak. End with "Try again."
`.trim();
  }

  try {
    // Call OpenAI's chat completion
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful chess coach who gives clear, concise explanations in 1-2 sentences only.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 100, // Reduced from 200 to force shorter responses
    });

    // Extract the explanation text
    const explanation = response.choices[0].message.content.trim();
    return res.status(200).json({ explanation });
  } catch (err) {
    console.error('OpenAI error:', err);
    return res
      .status(500)
      .json({ error: 'OpenAI request failed. Please try again later.' });
  }
}
