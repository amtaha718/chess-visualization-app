// api/analyzeIncorrectMove.js - ADDING CLAUDE BACK

import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  console.log('🔍 === CLAUDE ANALYSIS API ===');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { 
      positionAfter3Moves,
      positionAfterUserMove, 
      playingAs, 
      userMove,
      correctMove 
    } = req.body;
    
    console.log('- Playing as:', playingAs);
    console.log('- User move:', userMove);
    console.log('- Position after user move:', positionAfterUserMove);

    // Check if we have Claude API key
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('Missing ANTHROPIC_API_KEY');
    }

    // Use Claude to analyze the position
    const anthropic = new Anthropic({ apiKey });

    const prompt = `You are a chess expert. Analyze this position:

Position after student's move (FEN): ${positionAfterUserMove}
Student (playing as ${playingAs === 'white' ? 'White' : 'Black'}) just played: ${userMove}

Looking at this exact position, explain in 1 sentence what immediate problem this move creates for ${playingAs === 'white' ? 'White' : 'Black'}. 

Focus on what this allows the opponent (${playingAs === 'white' ? 'Black' : 'White'}) to do next. Be specific about tactical consequences.

Examples:
- "This allows White to force mate quickly."
- "This hangs your queen to Black's rook."
- "This ignores Black's back-rank threats."

Only reference pieces that exist in the FEN. End with "Try again." Keep under 12 words total.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 40,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }]
    });

    const explanation = response.content[0].text.trim();
    console.log('🎯 Claude explanation:', explanation);

    return res.status(200).json({ 
      explanation,
      method: 'claude_analysis',
      playingAs: playingAs,
      position: positionAfterUserMove
    });

  } catch (error) {
    console.error('❌ Claude API error:', error);
    
    // Fallback to color-aware generic responses
    const fallbackResponses = {
      white: "This move allows Black to gain advantage. Try again.",
      black: "This move allows White to gain advantage. Try again."
    };

    const { playingAs } = req.body;
    const fallback = fallbackResponses[playingAs] || "This move creates problems. Try again.";

    return res.status(200).json({ 
      explanation: fallback,
      method: 'fallback',
      error: error.message,
      playingAs: playingAs
    });
  }
}
