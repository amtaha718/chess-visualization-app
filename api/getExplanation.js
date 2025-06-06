// api/getExplanation.js - Updated for Claude API

import Anthropic from '@anthropic-ai/sdk';

/**
 * A Vercel Serverless Function that returns explanations for chess moves using Claude.
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
    positionAfter3Moves, // Position before user's move
    positionAfterUserMove // NEW: Position after user's move
  } = req.body;
  
  console.log('🤖 CLAUDE EXPLANATION REQUEST RECEIVED:');
  console.log('==========================================');
  console.log('📋 Request Data:');
  console.log('- originalFen:', originalFen);
  console.log('- moves:', moves);
  console.log('- userMove:', userMove);
  console.log('- correctMove:', correctMove);
  console.log('- playingAs:', playingAs);
  console.log('- isCorrect:', isCorrect);
  console.log('- positionAfter3Moves:', positionAfter3Moves || 'Not provided');
  console.log('- positionAfterUserMove:', positionAfterUserMove || 'Not provided');
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

  // Read the secret key from environment
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('❌ ANTHROPIC_API_KEY is not set in environment');
    return res
      .status(500)
      .json({ error: 'Server misconfiguration: missing API key' });
  }

  // Initialize the Anthropic client
  const anthropic = new Anthropic({ 
    apiKey: apiKey 
  });

  let prompt;
  
  if (isCorrect) {
    console.log('✅ Generating CORRECT answer explanation');
    
    // For correct answers, use the position after 3 moves if available
    if (positionAfter3Moves) {
      prompt = `You are a chess expert analyzing a puzzle solution.

Current position (FEN): ${positionAfter3Moves}
The winning move ${correctMove} was just played by ${playingAs === 'white' ? 'White' : 'Black'}.

Analyze this exact FEN position and explain in 1-2 concise sentences why ${correctMove} (moving from ${correctMove.slice(0,2)} to ${correctMove.slice(2,4)}) wins or gives a decisive advantage.

Important: Only reference pieces that actually exist in this FEN position. Focus on the main tactical theme (fork, pin, skewer, back-rank mate, etc.) or strategic benefit.

Keep your explanation clear and under 40 words.`;
    } else {
      prompt = `You are a chess expert analyzing a puzzle solution.

Starting position (FEN): ${originalFen}

Move sequence:
1. ${moves[0]} (creates the tactical opportunity)
2. ${moves[1]} (correct move by ${playingAs === 'white' ? 'White' : 'Black'})
3. ${moves[2]} (opponent's response)
4. ${moves[3]} (the winning move by ${playingAs === 'white' ? 'White' : 'Black'})

Explain in 1-2 sentences why this move sequence wins. Focus on the main tactical theme and the decisive advantage gained.

Keep it concise and under 40 words.`;
    }
  } else {
    console.log('❌ Generating INCORRECT answer explanation');
    
    if (positionAfter3Moves) {
      prompt = `You are a chess expert analyzing a student's mistake.

Current position (FEN): ${positionAfter3Moves}
It is ${playingAs === 'white' ? 'White' : 'Black'}'s turn.
The student attempted: ${userMove} (from ${userMove.slice(0,2)} to ${userMove.slice(2,4)})
The correct move was: ${correctMove}

Looking at this exact FEN position, explain in 1-2 sentences why ${userMove} is a mistake. What immediate threat or disadvantage does this move allow?

Important: Only reference pieces that actually exist in this FEN position. Be specific about what goes wrong after this move.

End with "Try again." Keep under 40 words.`;
    } else {
      prompt = `You are a chess expert analyzing a student's mistake.

Starting FEN: ${originalFen}

After these moves:
1. ${moves[0]}
2. ${moves[1]}
3. ${moves[2]}

The student (playing as ${playingAs === 'white' ? 'White' : 'Black'}) tried: ${userMove}
The correct move was: ${correctMove}

Explain in 1-2 sentences why ${userMove} is inferior to ${correctMove}. What tactical opportunity or advantage does the student miss?

End with "Try again." Keep under 40 words.`;
    }
  }

  console.log('📝 Generated prompt:');
  console.log('==========================================');
  console.log(prompt);
  console.log('==========================================');

  try {
    console.log('🚀 Sending request to Claude...');
    
    // Call Claude's message API
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 100,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    console.log('✅ Claude response received');
    console.log('📤 Response data:', {
      model: response.model,
      usage: response.usage,
      stop_reason: response.stop_reason
    });

    // Extract the explanation text
    const explanation = response.content[0].text.trim();
    
    console.log('🎯 Generated explanation:');
    console.log('==========================================');
    console.log(explanation);
    console.log('==========================================');
    
    console.log('✅ Sending explanation back to client');
    return res.status(200).json({ 
      explanation,
      model: 'claude-3.5-sonnet'
    });
    
  } catch (err) {
    console.error('❌ Claude API error:', err);
    console.error('Error details:', {
      name: err.name,
      message: err.message,
      status: err.status,
      type: err.type
    });
    
    return res
      .status(500)
      .json({ error: 'Claude request failed. Please try again later.' });
  }
}
