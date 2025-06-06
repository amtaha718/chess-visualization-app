// api/analyzeIncorrectMove.js - MINIMAL WORKING VERSION

export default async function handler(req, res) {
  console.log('🔍 === MINIMAL ANALYSIS API TEST ===');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { playingAs, userMove } = req.body;
    
    console.log('- Playing as:', playingAs);
    console.log('- User move:', userMove);

    // Simple color-aware responses without external APIs
    const responses = {
      white: [
        "This move allows Black to counterattack. Try again.",
        "This hangs material to Black. Try again.", 
        "This ignores Black's threats. Try again."
      ],
      black: [
        "This move allows White to continue attacking. Try again.",
        "This hangs material to White. Try again.",
        "This ignores White's threats. Try again."
      ]
    };

    const colorResponses = responses[playingAs] || responses.black;
    const explanation = colorResponses[Math.floor(Math.random() * colorResponses.length)];

    console.log('🎯 Generated explanation:', explanation);

    return res.status(200).json({ 
      explanation,
      method: 'minimal_test',
      playingAs: playingAs,
      status: 'working'
    });

  } catch (error) {
    console.error('❌ Minimal API error:', error);
    
    return res.status(500).json({ 
      error: 'Minimal API failed',
      details: error.message,
      fallback: 'This move creates problems. Try again.'
    });
  }
}
