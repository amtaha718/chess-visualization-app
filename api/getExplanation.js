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
 *     isCorrect: boolean,       // true for correct answer explanation
 *     positionAfter3Moves: string // FEN after applying first 3 moves (optional but recommended)
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
  const { 
    originalFen, 
    moves, 
    userMove, 
    correctMove, 
    playingAs = 'white', 
    isCorrect = false,
    positionAfter3Moves // New optional parameter
  } = req.body;
  
  console.log('🤖 AI EXPLANATION REQUEST RECEIVED:');
  console.log('==========================================');
  console.log('📋 Request Data:');
  console.log('- originalFen:', originalFen);
  console.log('- moves:', moves);
  console.log('- userMove:', userMove);
  console.log('- correctMove:', correctMove);
  console.log('- playingAs:', playingAs);
  console.log('- isCorrect:', isCorrect);
  console.log('- positionAfter3Moves:', positionAfter3Moves || 'Not provided');
  console.log('==========================================');
  
  if (!originalFen || !moves || !correctMove) {
    console.error('❌ Missing required fields');
    return res.status(400).json({
      error: 'Missing required fields: originalFen, moves, correctMove',
    });
  }

  // Validate moves array
  if (!Array.isArray(moves) || moves.length !== 4) {
    console.error('❌ Invalid moves array:', moves);
    return res.status(400).json({
      error: 'Moves must be an array of exactly 4 moves',
    });
  }

  // Log each move for clarity
  console.log('🔍 MOVE SEQUENCE ANALYSIS:');
  console.log('Starting position FEN:', originalFen);
  console.log('Move 1 (opponent):', moves[0]);
  console.log('Move 2 (solution start):', moves[1]);
  console.log('Move 3 (opponent response):', moves[2]);
  console.log('Move 4 (what should be played):', moves[3]);
  console.log('User attempted:', userMove);
  console.log('Playing as:', playingAs);
  if (positionAfter3Moves) {
    console.log('Position after 3 moves:', positionAfter3Moves);
  }

  // Read the secret key from environment
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('❌ OPENAI_API_KEY is not set in environment');
    return res
      .status(500)
      .json({ error: 'Server misconfiguration: missing API key' });
  }

  // Initialize the OpenAI client
  const openai = new OpenAI({ apiKey });

  let prompt;
  let systemPrompt = 'You are a helpful chess coach who gives clear, concise explanations in 1-2 sentences only. You carefully analyze chess positions and never mention pieces that do not exist on the board.';
  
  if (isCorrect) {
    console.log('✅ Generating CORRECT answer explanation');
    
    // For correct answers, we can use either the position after 3 moves or describe the sequence
    if (positionAfter3Moves) {
      prompt = `
Chess position (FEN): ${positionAfter3Moves}
The correct move ${moves[3]} was just played by ${playingAs === 'white' ? 'White' : 'Black'}.

In 1-2 sentences, explain why this move wins or gives a significant advantage. Focus on the main tactical theme or strategic benefit.
`.trim();
    } else {
      prompt = `
Starting position (FEN): ${originalFen}
Moves played:
1. ${moves[0]} (opponent's move that creates the tactical opportunity)
2. ${moves[1]} (first correct move by ${playingAs === 'white' ? 'White' : 'Black'})
3. ${moves[2]} (opponent's response)
4. ${moves[3]} (the winning move by ${playingAs === 'white' ? 'White' : 'Black'})

Explain in exactly 1-2 short sentences why this move sequence wins. Focus on the main tactical theme (fork, pin, discovered attack, etc.) and the key advantage gained.

Keep it concise and clear.
`.trim();
    }
  } else {
    console.log('❌ Generating INCORRECT answer explanation');
    console.log('🔍 Building analysis prompt...');
    
    // For incorrect answers, prefer using the exact position if available
    if (positionAfter3Moves) {
      prompt = `
Current chess position (FEN): ${positionAfter3Moves}
It is ${playingAs === 'white' ? 'White' : 'Black'}'s turn.
The player attempted: ${userMove} (moving from ${userMove.slice(0,2)} to ${userMove.slice(2,4)})

Looking at this exact position:
1. What piece is on square ${userMove.slice(0,2)}?
2. Why is moving it to ${userMove.slice(2,4)} a mistake?

Explain in 1-2 sentences what immediate threat or loss this move allows. Only mention pieces visible in the FEN above. End with "Try again."
`.trim();
    } else {
      // Fallback to move sequence if position not provided
      prompt = `
Starting position FEN: ${originalFen}

Apply these 3 moves in order:
1. ${moves[0]} (${moves[0].slice(0,2)} to ${moves[0].slice(2,4)})
2. ${moves[1]} (${moves[1].slice(0,2)} to ${moves[1].slice(2,4)})  
3. ${moves[2]} (${moves[2].slice(0,2)} to ${moves[2].slice(2,4)})

After these 3 moves, it is ${playingAs === 'white' ? 'White' : 'Black'}'s turn.
The student tried: ${userMove} (${userMove.slice(0,2)} to ${userMove.slice(2,4)})

CRITICAL: Before analyzing, identify what piece is ACTUALLY on ${userMove.slice(0,2)} after the 3 moves above.
Then explain in 1-2 sentences why ${userMove} is a mistake - what does it allow the opponent to do?
Do NOT guess at pieces - only mention pieces you are certain about from the move sequence.
End with "Try again."
`.trim();
    }
  }

  console.log('📝 Generated prompt:');
  console.log('==========================================');
  console.log(prompt);
  console.log('==========================================');

  try {
    console.log('🚀 Sending request to OpenAI...');
    
    // Call OpenAI's chat completion
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { 
          role: 'system', 
          content: systemPrompt
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 100, // Keep responses short
    });

    console.log('✅ OpenAI response received');
    console.log('📤 Response data:', {
      model: response.model,
      usage: response.usage,
      choices: response.choices.length
    });

    // Extract the explanation text
    const explanation = response.choices[0].message.content.trim();
    
    console.log('🎯 Generated explanation:');
    console.log('==========================================');
    console.log(explanation);
    console.log('==========================================');
    
    console.log('✅ Sending explanation back to client');
    return res.status(200).json({ explanation });
    
  } catch (err) {
    console.error('❌ OpenAI error:', err);
    console.error('Error details:', {
      name: err.name,
      message: err.message,
      status: err.status,
      code: err.code
    });
    
    return res
      .status(500)
      .json({ error: 'OpenAI request failed. Please try again later.' });
  }
}
