// api/openings/index.js - Main openings API router - FIXED VERSION

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    switch (req.method) {
      case 'GET':
        if (action === 'list') {
          return await getOpeningsList(req, res);
        } else if (action === 'variations') {
          return await getOpeningVariations(req, res);
        } else if (action === 'progress') {
          return await getUserProgress(req, res);
        } else if (action === 'stats') {
          return await getOpeningStats(req, res);
        }
        break;

      case 'POST':
        if (action === 'attempt') {
          return await recordAttempt(req, res);
        } else if (action === 'progress') {
          return await updateProgress(req, res);
        }
        break;

      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }

    return res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

// ===== GET ENDPOINTS =====

/**
 * Get list of openings with optional filtering
 * Query params: category, difficulty, limit, search
 */
async function getOpeningsList(req, res) {
  const { 
    category, 
    difficulty, 
    limit = 50, 
    search,
    includeProgress = false
  } = req.query;

  console.log('📚 Fetching openings list:', { category, difficulty, limit, search });

  try {
    let query = supabase
      .from('openings')
      .select(`
        *,
        opening_variations!inner(
          id,
          variation_name,
          move_count,
          is_main_line,
          frequency_score
        )
      `)
      .eq('is_active', true)
      .order('popularity_score', { ascending: false });

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category);
    }

    if (difficulty && difficulty !== 'all') {
      query = query.eq('difficulty', difficulty);
    }

    if (search) {
      query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: openings, error } = await query;

    if (error) throw error;

    // If user wants progress data, fetch it
    let progressData = {};
    if (includeProgress && req.headers.authorization) {
      const user = await getUserFromToken(req.headers.authorization);
      if (user) {
        progressData = await getUserProgressData(user.id);
      }
    }

    // Transform data to include progress
    const enrichedOpenings = openings.map(opening => ({
      ...opening,
      variations: opening.opening_variations.map(variation => ({
        ...variation,
        userProgress: progressData[variation.id] || null
      }))
    }));

    console.log(`✅ Retrieved ${enrichedOpenings.length} openings`);

    return res.status(200).json({
      openings: enrichedOpenings,
      total: enrichedOpenings.length,
      filters: { category, difficulty, search }
    });

  } catch (error) {
    console.error('❌ Error fetching openings:', error);
    return res.status(500).json({ error: 'Failed to fetch openings' });
  }
}

/**
 * Get variations for a specific opening
 * Query params: openingId, includeProgress
 */
async function getOpeningVariations(req, res) {
  const { openingId, includeProgress = false } = req.query;

  if (!openingId) {
    return res.status(400).json({ error: 'Opening ID is required' });
  }

  console.log('🔍 Fetching variations for opening:', openingId);

  try {
    const { data: variations, error } = await supabase
      .from('opening_variations')
      .select(`
        *,
        openings!inner(
          name,
          eco_code,
          category,
          difficulty,
          description
        )
      `)
      .eq('opening_id', openingId)
      .order('is_main_line', { ascending: false })
      .order('frequency_score', { ascending: false });

    if (error) throw error;

    if (!variations || variations.length === 0) {
      return res.status(404).json({ error: 'No variations found for this opening' });
    }

    // Add user progress if requested
    let progressData = {};
    if (includeProgress && req.headers.authorization) {
      const user = await getUserFromToken(req.headers.authorization);
      if (user) {
        const variationIds = variations.map(v => v.id);
        const { data: progress } = await supabase
          .from('user_opening_progress')
          .select('*')
          .eq('user_id', user.id)
          .in('variation_id', variationIds);
        
        if (progress) {
          progress.forEach(p => {
            progressData[p.variation_id] = p;
          });
        }
      }
    }

    const enrichedVariations = variations.map(variation => ({
      ...variation,
      userProgress: progressData[variation.id] || null
    }));

    console.log(`✅ Retrieved ${enrichedVariations.length} variations`);

    return res.status(200).json({
      opening: variations[0].openings,
      variations: enrichedVariations
    });

  } catch (error) {
    console.error('❌ Error fetching variations:', error);
    return res.status(500).json({ error: 'Failed to fetch variations' });
  }
}

/**
 * Get user's progress across all openings
 */
async function getUserProgress(req, res) {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('📊 Fetching user progress for:', user.id);

    const { data: progress, error } = await supabase
      .from('user_opening_progress')
      .select(`
        *,
        opening_variations!inner(
          id,
          variation_name,
          move_count,
          openings!inner(
            name,
            eco_code,
            difficulty
          )
        )
      `)
      .eq('user_id', user.id)
      .order('last_practiced_at', { ascending: false });

    if (error) throw error;

    // Calculate summary statistics
    const stats = {
      totalVariations: progress.length,
      completedVariations: progress.filter(p => p.is_completed).length,
      totalPracticeRounds: progress.reduce((sum, p) => sum + p.total_practice_rounds, 0),
      averageMasteryLevel: progress.length > 0 
        ? Math.round(progress.reduce((sum, p) => sum + p.mastery_level, 0) / progress.length)
        : 0,
      byDifficulty: {},
      recentActivity: progress.slice(0, 10)
    };

    // Group by difficulty
    progress.forEach(p => {
      const difficulty = p.opening_variations.openings.difficulty;
      if (!stats.byDifficulty[difficulty]) {
        stats.byDifficulty[difficulty] = { total: 0, completed: 0 };
      }
      stats.byDifficulty[difficulty].total++;
      if (p.is_completed) {
        stats.byDifficulty[difficulty].completed++;
      }
    });

    console.log(`✅ Retrieved progress for ${progress.length} variations`);

    return res.status(200).json({
      progress,
      stats
    });

  } catch (error) {
    console.error('❌ Error fetching user progress:', error);
    return res.status(500).json({ error: 'Failed to fetch user progress' });
  }
}

/**
 * Get opening statistics and analytics
 */
async function getOpeningStats(req, res) {
  console.log('📈 Fetching opening statistics');

  try {
    // Get opening counts by category and difficulty
    const { data: openingStats, error: openingError } = await supabase
      .from('openings')
      .select('category, difficulty')
      .eq('is_active', true);

    if (openingError) throw openingError;

    // Get variation counts and move statistics
    const { data: variationStats, error: variationError } = await supabase
      .from('opening_variations')
      .select('move_count, frequency_score, is_main_line');

    if (variationError) throw variationError;

    // Get user engagement stats (if available)
    const { data: userStats, error: userError } = await supabase
      .from('user_opening_progress')
      .select('mastery_level, total_practice_rounds, is_completed');

    // Compile statistics
    const stats = {
      openings: {
        total: openingStats.length,
        byCategory: {},
        byDifficulty: {}
      },
      variations: {
        total: variationStats.length,
        mainLines: variationStats.filter(v => v.is_main_line).length,
        averageMoves: variationStats.length > 0 
          ? Math.round(variationStats.reduce((sum, v) => sum + v.move_count, 0) / variationStats.length)
          : 0,
        averageFrequency: variationStats.length > 0
          ? Math.round(variationStats.reduce((sum, v) => sum + v.frequency_score, 0) / variationStats.length)
          : 0
      },
      users: userStats ? {
        totalLearners: userStats.length,
        averageMastery: userStats.length > 0
          ? Math.round(userStats.reduce((sum, u) => sum + u.mastery_level, 0) / userStats.length)
          : 0,
        completionRate: userStats.length > 0
          ? Math.round((userStats.filter(u => u.is_completed).length / userStats.length) * 100)
          : 0
      } : null
    };

    // Group opening stats
    openingStats.forEach(opening => {
      // By category
      stats.openings.byCategory[opening.category] = 
        (stats.openings.byCategory[opening.category] || 0) + 1;
      
      // By difficulty
      stats.openings.byDifficulty[opening.difficulty] = 
        (stats.openings.byDifficulty[opening.difficulty] || 0) + 1;
    });

    console.log('✅ Compiled opening statistics');

    return res.status(200).json(stats);

  } catch (error) {
    console.error('❌ Error fetching statistics:', error);
    return res.status(500).json({ error: 'Failed to fetch statistics' });
  }
}

// ===== POST ENDPOINTS =====

/**
 * Record a practice attempt
 */
async function recordAttempt(req, res) {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      variationId,
      moveDepth,
      attemptedMoves,
      correctMoves,
      isPerfect,
      timeTaken,
      practiceRound,
      mistakeMoves = []
    } = req.body;

    // Validate required fields
    if (!variationId || !moveDepth || !attemptedMoves || !correctMoves || practiceRound === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['variationId', 'moveDepth', 'attemptedMoves', 'correctMoves', 'practiceRound']
      });
    }

    console.log('📝 Recording practice attempt:', {
      userId: user.id,
      variationId,
      moveDepth,
      isPerfect,
      practiceRound
    });

    // Insert attempt record
    const { data: attempt, error: attemptError } = await supabase
      .from('user_opening_attempts')
      .insert({
        user_id: user.id,
        variation_id: variationId,
        move_depth: moveDepth,
        attempted_moves: attemptedMoves,
        correct_moves: correctMoves,
        is_perfect: isPerfect,
        mistakes_count: mistakeMoves.length,
        time_taken: timeTaken,
        mistake_moves: mistakeMoves,
        practice_round: practiceRound
      })
      .select()
      .single();

    if (attemptError) throw attemptError;

    // Update user progress
    await updateUserProgressAfterAttempt(user.id, variationId, isPerfect, timeTaken);

    console.log('✅ Recorded attempt:', attempt.id);

    return res.status(201).json({
      attempt,
      message: 'Attempt recorded successfully'
    });

  } catch (error) {
    console.error('❌ Error recording attempt:', error);
    return res.status(500).json({ error: 'Failed to record attempt' });
  }
}

/**
 * Update user progress
 */
async function updateProgress(req, res) {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const {
      variationId,
      currentMoveDepth,
      masteryLevel,
      isCompleted,
      consecutiveCorrect
    } = req.body;

    if (!variationId) {
      return res.status(400).json({ error: 'Variation ID is required' });
    }

    console.log('🔄 Updating user progress:', {
      userId: user.id,
      variationId,
      currentMoveDepth,
      masteryLevel,
      isCompleted
    });

    // Get variation info for max move depth
    const { data: variation, error: variationError } = await supabase
      .from('opening_variations')
      .select('move_count')
      .eq('id', variationId)
      .single();

    if (variationError) throw variationError;

    // Upsert progress record
    const { data: progress, error: progressError } = await supabase
      .from('user_opening_progress')
      .upsert({
        user_id: user.id,
        variation_id: variationId,
        current_move_depth: currentMoveDepth,
        max_move_depth: variation.move_count,
        mastery_level: masteryLevel || 0,
        consecutive_correct: consecutiveCorrect || 0,
        is_completed: isCompleted || false,
        last_practiced_at: new Date().toISOString(),
        completed_at: isCompleted ? new Date().toISOString() : null
      }, {
        onConflict: 'user_id,variation_id'
      })
      .select()
      .single();

    if (progressError) throw progressError;

    console.log('✅ Updated progress:', progress.id);

    return res.status(200).json({
      progress,
      message: 'Progress updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating progress:', error);
    return res.status(500).json({ error: 'Failed to update progress' });
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Extract user from authorization token
 */
async function getUserFromToken(authHeader) {
  if (!authHeader) return null;
  
  try {
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error) throw error;
    return user;
  } catch (error) {
    console.error('Token validation error:', error);
    return null;
  }
}

/**
 * Get user progress data for multiple variations
 */
async function getUserProgressData(userId) {
  const { data: progress, error } = await supabase
    .from('user_opening_progress')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user progress:', error);
    return {};
  }

  const progressMap = {};
  progress.forEach(p => {
    progressMap[p.variation_id] = p;
  });

  return progressMap;
}

/**
 * Update user progress after an attempt
 */
async function updateUserProgressAfterAttempt(userId, variationId, isPerfect, timeTaken) {
  try {
    // Get current progress
    const { data: currentProgress, error: fetchError } = await supabase
      .from('user_opening_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('variation_id', variationId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // Not found is OK
      throw fetchError;
    }

    // Get recent attempts to calculate mastery
    const { data: recentAttempts, error: attemptsError } = await supabase
      .from('user_opening_attempts')
      .select('is_perfect, created_at')
      .eq('user_id', userId)
      .eq('variation_id', variationId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (attemptsError) throw attemptsError;

    // Calculate new mastery level
    const totalAttempts = recentAttempts.length;
    const perfectAttempts = recentAttempts.filter(a => a.is_perfect).length;
    const masteryLevel = totalAttempts > 0 ? Math.round((perfectAttempts / totalAttempts) * 100) : 0;

    // Calculate consecutive correct
    let consecutiveCorrect = 0;
    for (const attempt of recentAttempts) {
      if (attempt.is_perfect) {
        consecutiveCorrect++;
      } else {
        break;
      }
    }

    // Update progress
    const progressUpdate = {
      user_id: userId,
      variation_id: variationId,
      mastery_level: masteryLevel,
      consecutive_correct: consecutiveCorrect,
      total_practice_rounds: (currentProgress?.total_practice_rounds || 0) + 1,
      last_practiced_at: new Date().toISOString()
    };

    // Set initial values if this is the first attempt
    if (!currentProgress) {
      const { data: variation } = await supabase
        .from('opening_variations')
        .select('move_count')
        .eq('id', variationId)
        .single();

      progressUpdate.current_move_depth = 6; // Start with 6 moves (3 for each side)
      progressUpdate.max_move_depth = variation?.move_count || 12;
      progressUpdate.started_at = new Date().toISOString();
    }

    const { error: updateError } = await supabase
      .from('user_opening_progress')
      .upsert(progressUpdate, {
        onConflict: 'user_id,variation_id'
      });

    if (updateError) throw updateError;

    console.log(`✅ Updated progress stats: ${masteryLevel}% mastery, ${consecutiveCorrect} consecutive`);

  } catch (error) {
    console.error('❌ Error updating progress after attempt:', error);
    // Don't throw - this is a background update
  }
}
