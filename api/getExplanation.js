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
  
  console.log('🤖 AI EXPLANATION REQUEST RECEIVED:');
  console.log('==========================================');
  console.log('📋 Request Data:');
  console.log('- originalFen:', originalFen);
  console.log('- moves:', moves);
  console.log('- userMove:', userMove);
  console.log('- correctMove:', correctMove);
  console.log('- playingAs:', playingAs);
  console.log('- isCorrect:', isCorrect);
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
  
  if (isCorrect) {
    console.log('✅ Generating CORRECT answer explanation');
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
    console.log('❌ Generating INCORRECT answer explanation');
    console.log('🔍 Building analysis prompt...');
    
    // Generate explanation for incorrect answer - IMPROVED WITH DEBUGGING
    prompt = `
You are a chess coach analyzing a tactical puzzle mistake.

IMPORTANT: Follow these steps exactly and show your work:

STEP 1: Start with this position: ${originalFen}

STEP 2: Apply these 3 moves in sequence:
Move 1: ${moves[0]} 
Move 2: ${moves[1]} 
Move 3: ${moves[2]}

STEP 3: In the resulting position, the student (playing as ${playingAs === 'white' ? 'White' : 'Black'}) played: ${userMove}

CRITICAL ANALYSIS RULES:
- ONLY mention pieces that exist on the board AFTER applying moves 1, 2, and 3
- Look at what immediate threats or material loss ${userMove} allows
- Be specific about which pieces can capture what AFTER the student's move
- Do NOT mention pieces from the starting position that may no longer exist
- Do NOT reveal the correct move (${correctMove})

EXAMPLE FORMAT: "This move allows [opponent's piece] to capture your [piece] on [square]."

Analyze the position after the 3 preliminary moves, then explain why ${userMove} is tactically weak. Keep to 1-2 sentences and end with "Try again."
`.trim();
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
          content: 'You are a helpful chess coach who gives clear, concise explanations in 1-2 sentences only. You carefully analyze chess positions step by step and only mention pieces that actually exist on the board.' 
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
