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
1. ${moves[0]} (${playingAs === 'white' ? 'Black' : 'White'}'s move)
2. ${moves[1]} (${playingAs === 'white' ? 'White' : 'Black'} plays)
3. ${moves[2]} (${playingAs === 'white' ? 'Black' : 'White'} responds)

Now ${playingAs === 'white' ? 'White' : 'Black'} must find move 4. The student (playing ${playingAs === 'white' ? 'White' : 'Black'}) tried "${userMove}".

CRITICAL RULES:
- The student is playing ${playingAs === 'white' ? 'White' : 'Black'}, so refer to opponent as ${playingAs === 'white' ? 'Black' : 'White'}
- Do NOT mention or hint at what the correct move would be
- Focus ONLY on the specific weakness of their chosen move
- Do NOT start with "Incorrect" (this will be added separately)

Explain in 1-2 sentences what SPECIFIC problem the move "${userMove}" creates for ${playingAs === 'white' ? 'White' : 'Black'}. Be concrete:
- Name specific pieces and squares (e.g., "leaves your knight on e5 undefended")
- Mention specific threats it allows the opponent (e.g., "allows Black's bishop to pin your rook")
- Point out specific weaknesses it creates (e.g., "weakens the f7 square")

End with: "Try again."
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
