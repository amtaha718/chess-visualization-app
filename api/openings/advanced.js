// api/openings/advanced.js - Advanced opening functionality

import { createClient } from '@supabase/supabase-js';
import { Chess } from 'chess.js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { action } = req.query;

  try {
    switch (req.method) {
      case 'GET':
        if (action === 'recommendations') {
          return await getPersonalizedRecommendations(req, res);
        } else if (action === 'analytics') {
          return await getUserAnalytics(req, res);
        } else if (action === 'leaderboard') {
          return await getLeaderboard(req, res);
        } else if (action === 'spaced-repetition') {
          return await getSpacedRepetitionQueue(req, res);
        }
        break;

      case 'POST':
        if (action === 'mastery-test') {
          return await conductMasteryTest(req, res);
        } else if (action === 'bulk-practice') {
          return await recordBulkPractice(req, res);
        }
        break;
    }

    return res.status(404).json({ error: 'Endpoint not found' });

  } catch (error) {
    console.error('Advanced API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// ===== PERSONALIZED RECOMMENDATIONS =====

/**
 * Get personalized opening recommendations based on user's progress and preferences
 */
async function getPersonalizedRecommendations(req, res) {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('🎯 Generating personalized recommendations for:', user.id);

    // Get user's current progress and preferences
    const { data: userProgress } = await supabase
      .from('user_opening_progress')
      .select(`
        *,
        opening_variations!inner(
          *,
          openings!inner(
            name,
            category,
            difficulty,
            eco_code
          )
        )
      `)
      .eq('user_id', user.id);

    // Get user's attempt history for analysis
    const { data: attempts } = await supabase
      .from('user_opening_attempts')
      .select('variation_id, is_perfect, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100);

    // Analyze user patterns
    const analysis = analyzeUserPatterns(userProgress, attempts);
    
    // Generate recommendations
    const recommendations = await generateRecommendations(analysis, userProgress);

    console.log(`✅ Generated ${recommendations.length} recommendations`);

    return res.status(200).json({
      recommendations,
      analysis,
      totalProgress: userProgress?.length || 0
    });

  } catch (error) {
    console.error('❌ Error generating recommendations:', error);
    return res.status(500).json({ error: 'Failed to generate recommendations' });
  }
}

/**
 * Analyze user learning patterns
 */
function analyzeUserPatterns(progress, attempts) {
  const patterns = {
    preferredCategories: {},
    difficultyProgression: {},
    practiceFrequency: 0,
    averageAccuracy: 0,
    strugglingAreas: [],
    strengths: [],
    recommendedDifficulty: 'beginner'
  };

  if (!progress || progress.length === 0) {
    return patterns;
  }

  // Analyze category preferences
  progress.forEach(p => {
    const category = p.opening_variations.openings.category;
    patterns.preferredCategories[category] = (patterns.preferredCategories[category] || 0) + 1;
  });

  // Analyze difficulty progression
  progress.forEach(p => {
    const difficulty = p.opening_variations.openings.difficulty;
    const mastery = p.mastery_level;
    
    if (!patterns.difficultyProgression[difficulty]) {
      patterns.difficultyProgression[difficulty] = { count: 0, totalMastery: 0 };
    }
    
    patterns.difficultyProgression[difficulty].count++;
    patterns.difficultyProgression[difficulty].totalMastery += mastery;
  });

  // Calculate average accuracy from recent attempts
  if (attempts && attempts.length > 0) {
    const perfectAttempts = attempts.filter(a => a.is_perfect).length;
    patterns.averageAccuracy = Math.round((perfectAttempts / attempts.length) * 100);
    
    // Calculate practice frequency (attempts per day over last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const recentAttempts = attempts.filter(a => new Date(a.created_at) > thirtyDaysAgo);
    patterns.practiceFrequency = Math.round(recentAttempts.length / 30 * 10) / 10;
  }

  // Identify struggling areas (low mastery, high attempt count)
  progress.forEach(p => {
    if (p.mastery_level < 60 && p.total_practice_rounds > 5) {
      patterns.strugglingAreas.push({
        opening: p.opening_variations.openings.name,
        variation: p.opening_variations.variation_name,
        mastery: p.mastery_level,
        attempts: p.total_practice_rounds
      });
    }
  });

  // Identify strengths (high mastery, completed)
  progress.forEach(p => {
    if (p.mastery_level >= 80 && p.is_completed) {
      patterns.strengths.push({
        opening: p.opening_variations.openings.name,
        variation: p.opening_variations.variation_name,
        mastery: p.mastery_level
      });
    }
  });

  // Recommend next difficulty level
  const difficultyOrder = ['beginner', 'intermediate', 'advanced'];
  for (const difficulty of difficultyOrder) {
    const diffData = patterns.difficultyProgression[difficulty];
    if (diffData && diffData.count > 0) {
      const avgMastery = diffData.totalMastery / diffData.count;
      if (avgMastery >= 75) {
        const nextIndex = difficultyOrder.indexOf(difficulty) + 1;
        patterns.recommendedDifficulty = difficultyOrder[nextIndex] || difficulty;
      } else {
        patterns.recommendedDifficulty = difficulty;
        break;
      }
    }
  }

  return patterns;
}

/**
 * Generate specific recommendations based on analysis
 */
async function generateRecommendations(analysis, userProgress) {
  const recommendations = [];
  
  // Get learned variation IDs to exclude
  const learnedVariationIds = userProgress?.map(p => p.variation_id) || [];
  
  // Recommendation 1: Address struggling areas
  if (analysis.strugglingAreas.length > 0) {
    recommendations.push({
      type: 'review',
      priority: 'high',
      title: 'Review Struggling Openings',
      description: `You have ${analysis.strugglingAreas.length} openings that need more practice`,
      variations: analysis.strugglingAreas.map(area => ({
        name: `${area.opening} - ${area.variation}`,
        reason: `${area.mastery}% mastery after ${area.attempts} attempts`
      })),
      action: 'Practice these variations with focus on common mistakes'
    });
  }

  // Recommendation 2: New openings in preferred categories
  const preferredCategory = Object.keys(analysis.preferredCategories)
    .reduce((a, b) => analysis.preferredCategories[a] > analysis.preferredCategories[b] ? a : b, 'Open');

  const { data: newOpenings } = await supabase
    .from('opening_variations')
    .select(`
      *,
      openings!inner(
        name,
        category,
        difficulty
      )
    `)
    .eq('openings.category', preferredCategory)
    .eq('openings.difficulty', analysis.recommendedDifficulty)
    .not('id', 'in', learnedVariationIds.length > 0 ? `(${learnedVariationIds.join(',')})` : '()')
    .eq('is_main_line', true)
    .order('frequency_score', { ascending: false })
    .limit(3);

  if (newOpenings && newOpenings.length > 0) {
    recommendations.push({
      type: 'learn',
      priority: 'medium',
      title: `New ${preferredCategory} Openings`,
      description: `Based on your preference for ${preferredCategory} games`,
      variations: newOpenings.map(v => ({
        id: v.id,
        name: `${v.openings.name} - ${v.variation_name}`,
        difficulty: v.openings.difficulty,
        moves: v.move_count
      })),
      action: `Learn these popular ${preferredCategory} openings`
    });
  }

  // Recommendation 3: Spaced repetition for completed openings
  const completedVariations = userProgress?.filter(p => 
    p.is_completed && 
    p.last_practiced_at && 
    (Date.now() - new Date(p.last_practiced_at).getTime()) > 7 * 24 * 60 * 60 * 1000 // 7 days
  ) || [];

  if (completedVariations.length > 0) {
    recommendations.push({
      type: 'review',
      priority: 'low',
      title: 'Spaced Repetition Review',
      description: `${completedVariations.length} completed openings need review`,
      variations: completedVariations.slice(0, 5).map(p => ({
        id: p.variation_id,
        name: `${p.opening_variations.openings.name} - ${p.opening_variations.variation_name}`,
        lastPracticed: p.last_practiced_at
      })),
      action: 'Quick review to maintain long-term memory'
    });
  }

  // Recommendation 4: Daily practice goal
  if (analysis.practiceFrequency < 1.0) {
    recommendations.push({
      type: 'habit',
      priority: 'medium',
      title: 'Increase Practice Frequency',
      description: `You're practicing ${analysis.practiceFrequency} times per day. Aim for 2-3 sessions.`,
      action: 'Set a daily practice reminder for consistent improvement'
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

// ===== USER ANALYTICS =====

/**
 * Get detailed user analytics and progress insights
 */
async function getUserAnalytics(req, res) {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { timeframe = '30d' } = req.query;
    
    console.log('📊 Generating analytics for user:', user.id, 'timeframe:', timeframe);

    // Calculate date range
    const days = timeframe === '7d' ? 7 : timeframe === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get user attempts in timeframe
    const { data: attempts } = await supabase
      .from('user_opening_attempts')
      .select(`
        *,
        opening_variations!inner(
          variation_name,
          openings!inner(
            name,
            category,
            difficulty
          )
        )
      `)
      .eq('user_id', user.id)
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Get current progress
    const { data: progress } = await supabase
      .from('user_opening_progress')
      .select(`
        *,
        opening_variations!inner(
          variation_name,
          move_count,
          openings!inner(
            name,
            category,
            difficulty
          )
        )
      `)
      .eq('user_id', user.id);

    // Generate analytics
    const analytics = generateUserAnalytics(attempts || [], progress || [], days);

    console.log('✅ Generated comprehensive analytics');

    return res.status(200).json({
      analytics,
      timeframe,
      totalAttempts: attempts?.length || 0,
      totalVariations: progress?.length || 0
    });

  } catch (error) {
    console.error('❌ Error generating analytics:', error);
    return res.status(500).json({ error: 'Failed to generate analytics' });
  }
}

/**
 * Generate comprehensive user analytics
 */
function generateUserAnalytics(attempts, progress, days) {
  const analytics = {
    summary: {
      totalAttempts: attempts.length,
      perfectAttempts: attempts.filter(a => a.is_perfect).length,
      averageAccuracy: 0,
      totalTimeSpent: attempts.reduce((sum, a) => sum + (a.time_taken || 0), 0),
      activeDays: new Set(attempts.map(a => a.created_at.split('T')[0])).size,
      averageSessionLength: 0
    },
    trends: {
      daily: [],
      accuracy: [],
      categories: {},
      difficulties: {}
    },
    insights: {
      streaks: calculateStreaks(attempts),
      improvementAreas: [],
      achievements: []
    },
    predictions: {
      nextMilestone: null,
      estimatedCompletion: null
    }
  };

  // Calculate summary statistics
  if (attempts.length > 0) {
    analytics.summary.averageAccuracy = Math.round(
      (analytics.summary.perfectAttempts / attempts.length) * 100
    );
    
    // Group attempts by session (within 30 minutes)
    const sessions = groupAttemptsBySessions(attempts);
    analytics.summary.averageSessionLength = sessions.length > 0 
      ? Math.round(sessions.reduce((sum, s) => sum + s.duration, 0) / sessions.length / 60) // minutes
      : 0;
  }

  // Daily activity trends
  const dailyStats = {};
  attempts.forEach(attempt => {
    const date = attempt.created_at.split('T')[0];
    if (!dailyStats[date]) {
      dailyStats[date] = { attempts: 0, perfect: 0, time: 0 };
    }
    dailyStats[date].attempts++;
    if (attempt.is_perfect) dailyStats[date].perfect++;
    dailyStats[date].time += attempt.time_taken || 0;
  });

  // Fill in missing days and create trends
  for (let i = 0; i < days; i++) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const stats = dailyStats[date] || { attempts: 0, perfect: 0, time: 0 };
    
    analytics.trends.daily.unshift({
      date,
      attempts: stats.attempts,
      accuracy: stats.attempts > 0 ? Math.round((stats.perfect / stats.attempts) * 100) : 0,
      timeSpent: Math.round(stats.time / 60) // minutes
    });
  }

  // Category and difficulty analysis
  attempts.forEach(attempt => {
    const category = attempt.opening_variations.openings.category;
    const difficulty = attempt.opening_variations.openings.difficulty;
    
    if (!analytics.trends.categories[category]) {
      analytics.trends.categories[category] = { attempts: 0, perfect: 0 };
    }
    if (!analytics.trends.difficulties[difficulty]) {
      analytics.trends.difficulties[difficulty] = { attempts: 0, perfect: 0 };
    }
    
    analytics.trends.categories[category].attempts++;
    analytics.trends.difficulties[difficulty].attempts++;
    
    if (attempt.is_perfect) {
      analytics.trends.categories[category].perfect++;
      analytics.trends.difficulties[difficulty].perfect++;
    }
  });

  // Add accuracy percentages
  Object.keys(analytics.trends.categories).forEach(category => {
    const cat = analytics.trends.categories[category];
    cat.accuracy = cat.attempts > 0 ? Math.round((cat.perfect / cat.attempts) * 100) : 0;
  });

  Object.keys(analytics.trends.difficulties).forEach(difficulty => {
    const diff = analytics.trends.difficulties[difficulty];
    diff.accuracy = diff.attempts > 0 ? Math.round((diff.perfect / diff.attempts) * 100) : 0;
  });

  // Generate insights
  analytics.insights.improvementAreas = identifyImprovementAreas(attempts, progress);
  analytics.insights.achievements = identifyAchievements(attempts, progress);

  return analytics;
}

/**
 * Group attempts into practice sessions
 */
function groupAttemptsBySessions(attempts) {
  const sessions = [];
  let currentSession = null;
  
  attempts.forEach(attempt => {
    const attemptTime = new Date(attempt.created_at).getTime();
    
    if (!currentSession || attemptTime - currentSession.endTime > 30 * 60 * 1000) { // 30 minutes
      currentSession = {
        startTime: attemptTime,
        endTime: attemptTime,
        attempts: [attempt],
        duration: 0
      };
      sessions.push(currentSession);
    } else {
      currentSession.attempts.push(attempt);
      currentSession.endTime = attemptTime;
      currentSession.duration = currentSession.endTime - currentSession.startTime;
    }
  });
  
  return sessions;
}

/**
 * Calculate practice streaks
 */
function calculateStreaks(attempts) {
  if (!attempts || attempts.length === 0) {
    return { current: 0, longest: 0, perfect: 0 };
  }

  const practicedays = [...new Set(attempts.map(a => a.created_at.split('T')[0]))].sort();
  
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 1;
  
  // Calculate practice streaks
  for (let i = 1; i < practicedays.length; i++) {
    const prevDate = new Date(practicedays[i - 1]);
    const currDate = new Date(practicedays[i]);
    const dayDiff = (currDate - prevDate) / (1000 * 60 * 60 * 24);
    
    if (dayDiff === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  
  longestStreak = Math.max(longestStreak, tempStreak);
  
  // Calculate current streak (from today backwards)
  const today = new Date().toISOString().split('T')[0];
  let checkDate = new Date();
  
  while (checkDate >= new Date(practicedays[0])) {
    const dateStr = checkDate.toISOString().split('T')[0];
    if (practicedays.includes(dateStr)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }
  
  // Calculate perfect attempt streak
  let perfectStreak = 0;
  for (let i = attempts.length - 1; i >= 0; i--) {
    if (attempts[i].is_perfect) {
      perfectStreak++;
    } else {
      break;
    }
  }
  
  return {
    current: currentStreak,
    longest: longestStreak,
    perfect: perfectStreak
  };
}

/**
 * Identify areas needing improvement
 */
function identifyImprovementAreas(attempts, progress) {
  const areas = [];
  
  // Low accuracy categories
  const categoryStats = {};
  attempts.forEach(attempt => {
    const category = attempt.opening_variations.openings.category;
    if (!categoryStats[category]) {
      categoryStats[category] = { total: 0, perfect: 0 };
    }
    categoryStats[category].total++;
    if (attempt.is_perfect) categoryStats[category].perfect++;
  });
  
  Object.entries(categoryStats).forEach(([category, stats]) => {
    const accuracy = stats.total > 0 ? (stats.perfect / stats.total) * 100 : 0;
    if (accuracy < 70 && stats.total >= 5) {
      areas.push({
        type: 'category',
        name: category,
        issue: 'Low accuracy',
        value: `${Math.round(accuracy)}%`,
        suggestion: `Focus on mastering ${category} opening principles`
      });
    }
  });
  
  // Variations with many attempts but low mastery
  progress.forEach(p => {
    if (p.total_practice_rounds > 10 && p.mastery_level < 60) {
      areas.push({
        type: 'variation',
        name: `${p.opening_variations.openings.name} - ${p.opening_variations.variation_name}`,
        issue: 'Plateau in learning',
        value: `${p.mastery_level}% after ${p.total_practice_rounds} attempts`,
        suggestion: 'Try different practice methods or review opening principles'
      });
    }
  });
  
  return areas.slice(0, 5); // Top 5 areas
}

/**
 * Identify user achievements
 */
function identifyAchievements(attempts, progress) {
  const achievements = [];
  
  // Practice milestones
  const milestones = [10, 25, 50, 100, 250, 500, 1000];
  const totalAttempts = attempts.length;
  
  milestones.forEach(milestone => {
    if (totalAttempts >= milestone) {
      achievements.push({
        type: 'practice',
        title: `${milestone} Practice Sessions`,
        description: `Completed ${milestone} opening practice attempts`,
        earnedAt: attempts[milestone - 1]?.created_at,
        icon: '🎯'
      });
    }
  });
  
  // Mastery achievements
  const masteredCount = progress.filter(p => p.mastery_level >= 90).length;
  if (masteredCount > 0) {
    achievements.push({
      type: 'mastery',
      title: `Master of ${masteredCount} Opening${masteredCount > 1 ? 's' : ''}`,
      description: `Achieved 90%+ mastery in ${masteredCount} opening variation${masteredCount > 1 ? 's' : ''}`,
      icon: '👑'
    });
  }
  
  // Perfect streaks
  const streaks = calculateStreaks(attempts);
  if (streaks.perfect >= 10) {
    achievements.push({
      type: 'streak',
      title: `Perfect ${streaks.perfect} Streak`,
      description: `${streaks.perfect} consecutive perfect attempts`,
      icon: '🔥'
    });
  }
  
  // Category expertise
  const categoryMastery = {};
  progress.forEach(p => {
    const category = p.opening_variations.openings.category;
    if (!categoryMastery[category]) {
      categoryMastery[category] = [];
    }
    if (p.mastery_level >= 80) {
      categoryMastery[category].push(p);
    }
  });
  
  Object.entries(categoryMastery).forEach(([category, variations]) => {
    if (variations.length >= 3) {
      achievements.push({
        type: 'expertise',
        title: `${category} Expert`,
        description: `Mastered ${variations.length} ${category} openings`,
        icon: '🏆'
      });
    }
  });
  
  return achievements.sort((a, b) => new Date(b.earnedAt || 0) - new Date(a.earnedAt || 0));
}

// ===== SPACED REPETITION =====

/**
 * Get openings due for spaced repetition review
 */
async function getSpacedRepetitionQueue(req, res) {
  try {
    const user = await getUserFromToken(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    console.log('🔄 Calculating spaced repetition queue for:', user.id);

    // Get completed variations with their last practice dates
    const { data: completedVariations, error } = await supabase
      .from('user_opening_progress')
      .select(`
        *,
        opening_variations!inner(
          *,
          openings!inner(
            name,
            category,
            difficulty
          )
        )
      `)
      .eq('user_id', user.id)
      .eq('is_completed', true)
      .order('last_practiced_at', { ascending: true });

    if (error) throw error;

    // Calculate which variations are due for review
    const now = new Date();
    const dueForReview = [];
    
    completedVariations.forEach(progress => {
      const lastPracticed = new Date(progress.last_practiced_at);
      const daysSinceLastPractice = Math.floor((now - lastPracticed) / (1000 * 60 * 60 * 24));
      
      // Spaced repetition intervals based on mastery level
      const interval = calculateReviewInterval(progress.mastery_level, progress.consecutive_correct);
      
      if (daysSinceLastPractice >= interval) {
        dueForReview.push({
          ...progress,
          daysSinceLastPractice,
          scheduledInterval: interval,
          priority: calculateReviewPriority(daysSinceLastPractice, interval, progress.mastery_level)
        });
      }
    });

    // Sort by priority (highest first)
    dueForReview.sort((a, b) => b.priority - a.priority);

    console.log(`✅ Found ${dueForReview.length} variations due for review`);

    return res.status(200).json({
      dueForReview: dueForReview.slice(0, 10), // Limit to top 10
      totalDue: dueForReview.length,
      totalCompleted: completedVariations.length,
      nextReviewDate: getNextReviewDate(completedVariations)
    });

  } catch (error) {
    console.error('❌ Error calculating spaced repetition:', error);
    return res.status(500).json({ error: 'Failed to calculate review queue' });
  }
}

/**
 * Calculate optimal review interval based on performance
 */
function calculateReviewInterval(masteryLevel, consecutiveCorrect) {
  // Base intervals in days
  const baseIntervals = [1, 3, 7, 14, 30, 60, 120];
  
  // Adjust based on mastery level
  let intervalIndex = Math.min(consecutiveCorrect, baseIntervals.length - 1);
  
  // Modify based on mastery level
  if (masteryLevel >= 95) {
    intervalIndex = Math.min(intervalIndex + 1, baseIntervals.length - 1);
  } else if (masteryLevel < 80) {
    intervalIndex = Math.max(intervalIndex - 1, 0);
  }
  
  return baseIntervals[intervalIndex];
}

/**
 * Calculate review priority score
 */
function calculateReviewPriority(daysSincePractice, scheduledInterval, masteryLevel) {
  // Higher score = higher priority
  let priority = daysSincePractice / scheduledInterval; // Overdue factor
  
  // Boost priority for lower mastery (more likely to forget)
  if (masteryLevel < 85) {
    priority *= 1.5;
  }
  
  // Cap the priority to prevent extremely high scores
  return Math.min(priority * 100, 1000);
}

/**
 * Get next review date across all completed variations
 */
function getNextReviewDate(completedVariations) {
  if (!completedVariations || completedVariations.length === 0) {
    return null;
  }
  
  let nextDate = null;
  
  completedVariations.forEach(progress => {
    const lastPracticed = new Date(progress.last_practiced_at);
    const interval = calculateReviewInterval(progress.mastery_level, progress.consecutive_correct);
    const nextReview = new Date(lastPracticed.getTime() + interval * 24 * 60 * 60 * 1000);
    
    if (!nextDate || nextReview < nextDate) {
      nextDate = nextReview;
    }
  });
  
  return nextDate?.toISOString();
}

// ===== HELPER FUNCTIONS =====

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
