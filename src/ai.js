// src/ai.js - COMPREHENSIVE DEBUG VERSION

/**
 * Calls our Vercel serverless function for incorrect move explanations.
 */
export async function getIncorrectMoveExplanation(originalFen, moves, userMove, correctMove, playingAs = 'white') {
  try {
    console.log('❌ === INCORRECT MOVE EXPLANATION ===');
    console.log('📤 Request data:', { originalFen, moves, userMove, correctMove, playingAs });
    
    const response = await fetch('/api/getExplanation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        originalFen,
        moves,
        userMove, 
        correctMove, 
        playingAs,
        isCorrect: false
      }),
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response ok:', response.ok);

    if (!response.ok) {
      const errorJson = await response.json();
      console.error('❌ API error:', errorJson);
      throw new Error(errorJson.error || 'Failed to fetch explanation');
    }

    const data = await response.json();
    console.log('✅ Incorrect explanation received:', data.explanation);
    return data.explanation;
  } catch (error) {
    console.error('❌ Error in getIncorrectMoveExplanation:', error);
    return 'That move is suboptimal. Try to avoid losing material or weakening your position.';
  }
}

/**
 * Gets or generates AI explanation for correct answers.
 */
export async function getCorrectMoveExplanation(puzzle, userSystem, playingAs) {
  console.log('✅ === CORRECT MOVE EXPLANATION START ===');
  console.log('📋 Input parameters:', {
    puzzleId: puzzle.id,
    playingAs: playingAs,
    hasAiExplanation: !!puzzle.ai_explanation,
    hasCachedExplanation: puzzle.ai_explanation ? 'YES' : 'NO',
    userSystemExists: !!userSystem
  });

  try {
    // TEMPORARILY SKIP CACHE FOR TESTING
    console.log('🔄 SKIPPING CACHE - Generating fresh explanation');
    
    console.log('🚀 Starting AI explanation generation...');
    console.log('📤 Request data will be:', {
      originalFen: puzzle.fen,
      moves: puzzle.moves,
      userMove: puzzle.moves[3], 
      correctMove: puzzle.moves[3],
      playingAs: playingAs,
      isCorrect: true
    });
    
    // Generate new explanation
    console.log('📡 Making fetch request to /api/getExplanation...');
    
    const response = await fetch('/api/getExplanation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        originalFen: puzzle.fen,
        moves: puzzle.moves,
        userMove: puzzle.moves[3], 
        correctMove: puzzle.moves[3],
        playingAs: playingAs,
        isCorrect: true
      }),
    });

    console.log('📥 Fetch response received:');
    console.log('- Status:', response.status);
    console.log('- StatusText:', response.statusText);
    console.log('- OK:', response.ok);
    console.log('- Headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('❌ Response not OK, getting error text...');
      const errorText = await response.text();
      console.error('❌ Error response body:', errorText);
      
      // Try to parse as JSON for more details
      try {
        const errorJson = JSON.parse(errorText);
        console.error('❌ Parsed error JSON:', errorJson);
      } catch (parseError) {
        console.error('❌ Could not parse error as JSON');
      }
      
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    console.log('✅ Response OK, parsing JSON...');
    const data = await response.json();
    console.log('📦 Response data:', data);
    
    const aiExplanation = data.explanation;
    console.log('🎯 Extracted explanation:', aiExplanation);
    console.log('🎯 Explanation type:', typeof aiExplanation);
    console.log('🎯 Explanation length:', aiExplanation ? aiExplanation.length : 'null/undefined');

    if (!aiExplanation) {
      console.error('❌ No explanation in response data');
      throw new Error('No explanation in response');
    }

    // Save to database
    if (userSystem && puzzle.id) {
      console.log('💾 Attempting to save explanation to database...');
      try {
        await userSystem.savePuzzleExplanation(puzzle.id, aiExplanation);
        console.log('✅ Explanation saved to database successfully');
      } catch (saveError) {
        console.error('❌ Failed to save to database:', saveError);
        // Don't throw - we still have the explanation
      }
    } else {
      console.log('⚠️ Not saving to database (userSystem or puzzle.id missing)');
    }

    console.log('✅ === CORRECT MOVE EXPLANATION SUCCESS ===');
    console.log('🎯 Returning explanation:', aiExplanation);
    return aiExplanation;
    
  } catch (error) {
    console.error('❌ === CORRECT MOVE EXPLANATION ERROR ===');
    console.error('❌ Error type:', error.name);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    
    // Check if it's a network error
    if (error.message.includes('fetch')) {
      console.error('🌐 This appears to be a network/fetch error');
    }
    
    // Check if it's a server error
    if (error.message.includes('HTTP')) {
      console.error('🔌 This appears to be an HTTP server error');
    }
    
    console.log('🔄 Falling back to original explanation...');
    console.log('📝 Original explanation:', puzzle.explanation);
    
    return puzzle.explanation;
  }
}
