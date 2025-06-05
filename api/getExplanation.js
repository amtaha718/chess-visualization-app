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
    // Generate explanation for correct answer
    prompt = `
You are a strong chess coach analyzing a tactical puzzle. Here's the puzzle:

Starting position (FEN): ${originalFen}
Moves played:
1. ${moves[0]} (opponent's move that creates the tactical opportunity)
2. ${moves[1]} (first correct move by ${playingAs === 'white' ? 'White' : 'Black'})
3. ${moves[2]} (opponent's response)
4. ${moves[3]} (the winning move by ${playingAs === 'white' ? 'White' : 'Black'})

Explain in 2-3 sentences why the move sequence ${moves[1]} followed by ${moves[3]} is winning for ${playingAs === 'white' ? 'White' : 'Black'}. Focus on the tactical theme (pin, fork, discovered attack, etc.) and what advantage it achieves. Be specific about the chess concepts demonstrated.

Keep the explanation concise and educational.
`.trim();
  } else {
    // Generate explanation for incorrect answer
    prompt = `
You are a strong chess coach. Here's a tactical puzzle position:

Starting position (FEN): ${originalFen}
The puzzle sequence so far:
1. ${moves[0]} (opponent's move creating a tactical opportunity)
2. ${moves[1]} (${playingAs === 'white' ? 'White' : 'Black'} plays)
3. ${moves[2]} (opponent responds)

Now ${playingAs === 'white' ? 'White' : 'Black'} must find move 4. The student tried "${userMove}", but the best move was "${correctMove}".

Important: The board is oriented from ${playingAs === 'white' ? "White's" : "Black's"} perspective.

In 1–2 clear sentences, explain why "${userMove}" fails to capitalize on the tactical opportunity, without revealing what the correct move achieves. Focus on what the student's move allows the opponent to do or what opportunity it misses.

Finish your explanation with: "Try again."
`.trim();
  }

  try {
    // Call OpenAI's chat completion
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful chess coach who gives clear, concise explanations.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 200,
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
