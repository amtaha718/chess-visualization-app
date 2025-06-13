// src/user-system.js - Complete fixed version with theme support and correct database schema

import { createClient } from '@supabase/supabase-js';

class UserSystem {
  constructor() {
    // Replace with your Supabase credentials
    const supabaseUrl = 'https://hwnpylgiiurhcftbmwzh.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3bnB5bGdpaXVyaGNmdGJtd3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODg2MDQsImV4cCI6MjA2NDQ2NDYwNH0.30vJugiZ3DWeTR53hU6R2sCrVqQ6kR-JaqKWi6RDILE';
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Cache for generated puzzles
    this.puzzleCache = new Map();
  }

  // ===== AUTHENTICATION =====
  
  async signUp(email, password, displayName = null) {
    try {
      const { data, error } = await this.supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: displayName || email.split('@')[0]
          }
        }
      });

      if (error) throw error;
      
      console.log('✅ User signed up successfully');
      return { user: data.user, error: null };
    } catch (error) {
      console.error('❌ Sign up error:', error);
      return { user: null, error: error.message };
    }
  }

  async signIn(email, password) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;
      
      console.log('✅ User signed in successfully');
      return { user: data.user, error: null };
    } catch (error) {
      console.error('❌ Sign in error:', error);
      return { user: null, error: error.message };
    }
  }

  async signOut() {
    try {
      const { error } = await this.supabase.auth.signOut();
      if (error) throw error;
      
      console.log('✅ User signed out successfully');
      return { error: null };
    } catch (error) {
      console.error('❌ Sign out error:', error);
      return { error: error.message };
    }
  }

  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.supabase.auth.getUser();
      if (error) throw error;
      return user;
    } catch (error) {
      console.error('❌ Get current user error:', error);
      return null;
    }
  }

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return this.supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session?.user || null);
    });
  }

  // ===== USER PROFILE =====
  
  async getUserProfile(userId = null) {
    try {
      const id = userId || (await this.getCurrentUser())?.id;
      if (!id) throw new Error('No user ID provided');

      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Get user profile error:', error);
      return null;
    }
  }

  async updateUserProfile(updates) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await this.supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user.id)
        .select()
        .single();

      if (error) throw error;
      
      console.log('✅ Profile updated successfully');
      return data;
    } catch (error) {
      console.error('❌ Update profile error:', error);
      return null;
    }
  }

  // ===== THEME FETCHING =====

  async fetchPuzzleThemes(difficulty = null, sequenceLength = null) {
    try {
      console.log('🏷️ Fetching puzzle themes...');
      
      let query = this.supabase
        .from('puzzles')
        .select('themes')
        .eq('is_validated', true);
      
      if (difficulty) {
        query = query.eq('difficulty', difficulty);
      }
      
      if (sequenceLength) {
        query = query.eq('move_count', sequenceLength);
      }
      
      const { data: puzzles, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching themes:', error);
        return [];
      }
      
      // Count individual themes from JSON arrays
      const themeCount = {};
      
      puzzles.forEach(puzzle => {
        if (puzzle.themes && Array.isArray(puzzle.themes)) {
          puzzle.themes.forEach(theme => {
            themeCount[theme] = (themeCount[theme] || 0) + 1;
          });
        }
      });
      
      // Convert to array and sort by count
      const themes = Object.entries(themeCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
      
      console.log('📊 Found themes:', themes);
      return themes;
      
    } catch (error) {
      console.error('❌ Failed to fetch themes:', error);
      return [];
    }
  }

  // ===== PUZZLE FETCHING WITH THEMES =====
  
  async getPuzzlesForUser(difficulty = 'intermediate', limit = 50, sequenceLength = 4, selectedTheme = 'all') {
    try {
      const user = await this.getCurrentUser();
      
      console.log('🎯 Fetching puzzles from database for user:', user?.id || 'guest');
      console.log('- Difficulty:', difficulty);
      console.log('- Sequence Length:', sequenceLength);
      console.log('- Theme:', selectedTheme);
      console.log('- Requested:', limit);
      
      // Fetch puzzles from database with theme filter
      const puzzles = await this.fetchPuzzlesFromDatabase(
        difficulty, 
        limit, 
        user?.id, 
        sequenceLength, 
        selectedTheme
      );
      
      if (user && puzzles.length > 0) {
        // Add user progress tracking for logged-in users
        return await this.addUserProgress(puzzles, user.id);
      } else {
        // Return puzzles without progress for guest users
        return puzzles.map(puzzle => ({
          ...puzzle,
          solved: false,
          attempted: false,
          bestTime: null,
          attemptCount: 0
        }));
      }
      
    } catch (error) {
      console.error('❌ Get puzzles error:', error);
      return [];
    }
  }

  async getPublicPuzzles(difficulty = 'intermediate', limit = 25, sequenceLength = 4, selectedTheme = 'all') {
    // For guest users, fetch from database with theme filter
    return this.fetchPuzzlesFromDatabase(difficulty, limit, null, sequenceLength, selectedTheme);
  }

  async fetchPuzzlesFromDatabase(difficulty, limit, userId = null, sequenceLength = 4, selectedTheme = 'all') {
    try {
      console.log('📚 Fetching puzzles from database');
      console.log(`- Theme filter: ${selectedTheme}`);
      
      // Define rating ranges for each difficulty
      const ratingRanges = {
        beginner: { min: 1000, max: 1400 },
        intermediate: { min: 1400, max: 1700 },
        advanced: { min: 1700, max: 2000 },
        expert: { min: 2000, max: 2500 }
      };
      
      const range = ratingRanges[difficulty] || ratingRanges.intermediate;
      
      // Build query
      let query = this.supabase
        .from('puzzles')
        .select('*')
        .gte('rating', range.min)
        .lte('rating', range.max)
        .eq('is_validated', true)
        .eq('move_count', sequenceLength);
      
      // Add theme filter if not 'all'
      if (selectedTheme !== 'all') {
        // Use PostgreSQL array contains operator for your text array
        query = query.contains('themes', [selectedTheme]);
      }
      
      // Get puzzles
      const { data: puzzles, error } = await query;
      
      if (error) {
        console.error('❌ Database query error:', error);
        throw error;
      }
      
      console.log(`📦 Found ${puzzles?.length || 0} puzzles for theme: ${selectedTheme}`);
      
      if (!puzzles || puzzles.length === 0) {
        console.warn(`⚠️ No puzzles found for theme: ${selectedTheme}`);
        return [];
      }
      
      // Shuffle puzzles to get random selection
      const shuffled = puzzles.sort(() => Math.random() - 0.5);
      
      // Return requested limit
      return shuffled.slice(0, limit);
      
    } catch (error) {
      console.error('❌ Failed to fetch puzzles from database:', error);
      return [];
    }
  }

  getDifficultyRating(difficulty) {
    const ratings = {
      'beginner': 1200,
      'intermediate': 1500,
      'advanced': 1800,
      'expert': 2100
    };
    return ratings[difficulty] || 1500;
  }

  // ===== FIXED USER PROGRESS (WORKS WITH EXISTING SCHEMA) =====

  async addUserProgress(puzzles, userId) {
    try {
      // Get user's progress on these puzzle IDs
      const puzzleIds = puzzles.map(p => p.id);
      
      // Query using your actual column names
      const { data: progress, error } = await this.supabase
        .from('user_puzzle_progress')
        .select('puzzle_id, status, attempts_count, best_time, first_solved_at')
        .eq('user_id', userId)
        .in('puzzle_id', puzzleIds);
      
      if (error) {
        console.error('❌ Error fetching user progress:', error);
      }
      
      // Create a map for quick lookup
      const progressMap = new Map();
      if (progress) {
        progress.forEach(p => {
          progressMap.set(p.puzzle_id, p);
        });
      }
      
      // Merge progress with puzzles using your schema
      return puzzles.map(puzzle => {
        const userProgress = progressMap.get(puzzle.id);
        return {
          ...puzzle,
          solved: userProgress?.status === 'solved' || false, // Convert status to boolean
          attempted: userProgress?.attempts_count > 0 || false,
          bestTime: userProgress?.best_time || null,
          attemptCount: userProgress?.attempts_count || 0,
          firstSolvedAt: userProgress?.first_solved_at || null
        };
      });
      
    } catch (error) {
      console.error('❌ Error adding user progress:', error);
      return puzzles.map(puzzle => ({
        ...puzzle,
        solved: false,
        attempted: false,
        bestTime: null,
        attemptCount: 0
      }));
    }
  }

  // ===== PUZZLE ATTEMPTS WITH RATING PROTECTION =====
  
  async recordPuzzleAttempt(puzzleId, solved, timeTaken, movesTried = [], shouldChangeRating = true) {
    try {
      const user = await this.getCurrentUser();
      console.log('🔍 Debug recordPuzzleAttempt:');
      console.log('- Current user:', user);
      console.log('- User ID:', user?.id);
      console.log('- Puzzle ID:', puzzleId);
      console.log('- Solved:', solved);
      console.log('- Should change rating:', shouldChangeRating);
      
      if (!user) {
        console.log('❌ No user found - not recording attempt');
        return null;
      }

      const profile = await this.getUserProfile();
      const ratingBefore = profile?.current_rating || 1200;
      console.log('- Rating before:', ratingBefore);

      let ratingChange = 0;
      let newRating = ratingBefore;

      // Only calculate rating change if shouldChangeRating is true
      if (shouldChangeRating) {
        ratingChange = this.calculateRatingChange(solved, ratingBefore);
        newRating = ratingBefore + ratingChange;

        // Update user's rating in profile
        await this.updateUserProfile({
          current_rating: newRating,
          highest_rating: Math.max(profile?.highest_rating || 1200, newRating),
          puzzles_attempted: (profile?.puzzles_attempted || 0) + 1,
          puzzles_solved: (profile?.puzzles_solved || 0) + (solved ? 1 : 0)
        });

        console.log(`✅ Rating updated: ${ratingBefore} → ${newRating} (${ratingChange >= 0 ? '+' : ''}${ratingChange})`);
      } else {
        // Still update attempt count and solved count, but not rating
        await this.updateUserProfile({
          puzzles_attempted: (profile?.puzzles_attempted || 0) + 1,
          puzzles_solved: (profile?.puzzles_solved || 0) + (solved ? 1 : 0)
        });

        console.log(`📊 Stats updated (no rating change): attempts +1, solved +${solved ? 1 : 0}`);
      }

      // Record in user_puzzle_attempts table (detailed history)
      try {
        await this.supabase
          .from('user_puzzle_attempts')
          .insert({
            user_id: user.id,
            puzzle_id: puzzleId,
            solved: solved,
            time_taken: timeTaken,
            moves_tried: movesTried,
            rating_before: ratingBefore,
            rating_after: newRating
          });
      } catch (attemptError) {
        console.warn('⚠️ Failed to record detailed attempt:', attemptError);
      }

      // Update user_puzzle_progress table (summary status)
      try {
        // First get current progress to handle attempts_count properly
        const { data: currentProgress } = await this.supabase
          .from('user_puzzle_progress')
          .select('attempts_count, status, best_time')
          .eq('user_id', user.id)
          .eq('puzzle_id', puzzleId)
          .single();

        const currentAttempts = currentProgress?.attempts_count || 0;
        const currentBestTime = currentProgress?.best_time;
        const newBestTime = solved ? 
          (currentBestTime ? Math.min(currentBestTime, timeTaken) : timeTaken) : 
          currentBestTime;

        await this.supabase
          .from('user_puzzle_progress')
          .upsert({
            user_id: user.id,
            puzzle_id: puzzleId,
            status: solved ? 'solved' : (currentProgress?.status === 'solved' ? 'solved' : 'attempted'),
            best_time: newBestTime,
            attempts_count: currentAttempts + 1,
            first_solved_at: solved && currentProgress?.status !== 'solved' ? new Date().toISOString() : currentProgress?.first_solved_at,
            last_attempted_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,puzzle_id'
          });
      } catch (progressError) {
        console.warn('⚠️ Failed to update progress:', progressError);
      }

      // Record rating history if rating changed
      if (shouldChangeRating && ratingChange !== 0) {
        try {
          await this.supabase
            .from('rating_history')
            .insert({
              user_id: user.id,
              old_rating: ratingBefore,
              new_rating: newRating,
              rating_change: ratingChange,
              puzzle_id: puzzleId,
              reason: solved ? 'puzzle_solved' : 'puzzle_failed'
            });
        } catch (historyError) {
          console.warn('⚠️ Failed to record rating history:', historyError);
        }
      }
      
      return {
        newRating,
        ratingChange,
        attemptId: `attempt_${Date.now()}`
      };
      
    } catch (error) {
      console.error('❌ Record puzzle attempt error:', error);
      return null;
    }
  }

  calculateRatingChange(solved, currentRating) {
    if (solved) {
      // Positive rating change for solving
      if (currentRating < 1400) return 20;
      if (currentRating < 1600) return 15;
      if (currentRating < 1800) return 10;
      return 8;
    } else {
      // Negative rating change for failing
      if (currentRating > 1800) return -8;
      if (currentRating > 1600) return -10;
      if (currentRating > 1400) return -12;
      return -15;
    }
  }

  // ===== USER STATS =====
  
  async getUserStats() {
    try {
      const user = await this.getCurrentUser();
      if (!user) return null;

      const profile = await this.getUserProfile();
      
      // Get recent rating history
      const { data: recentHistory } = await this.supabase
        .from('rating_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get user weaknesses
      const { data: weaknesses } = await this.supabase
        .from('user_weaknesses')
        .select('*')
        .eq('user_id', user.id)
        .order('weakness_score', { ascending: false });
      
      return {
        profile,
        recentHistory: recentHistory || [],
        weaknesses: weaknesses || []
      };

    } catch (error) {
      console.error('❌ Get user stats error:', error);
      return null;
    }
  }

  async getLeaderboard(limit = 10) {
    try {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select('username, display_name, current_rating, puzzles_solved')
        .order('current_rating', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Get leaderboard error:', error);
      return [];
    }
  }

  // ===== UTILITY METHODS =====

  async isAuthenticated() {
    const user = await this.getCurrentUser();
    return !!user;
  }

  async requireAuth() {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('Authentication required');
    }
    return user;
  }

  async savePuzzleExplanation(puzzleId, aiExplanation) {
    // Cache AI explanations
    console.log('💾 Caching AI explanation for puzzle:', puzzleId);
    this.puzzleCache.set(`explanation_${puzzleId}`, aiExplanation);
  }

  // ===== THEME ANALYSIS (OPTIONAL HELPER METHODS) =====

  async getThemeStats(userId = null) {
    try {
      const user = userId || (await this.getCurrentUser())?.id;
      if (!user) return null;

      // Get user's performance by theme
      const { data: attempts } = await this.supabase
        .from('user_puzzle_attempts')
        .select(`
          solved,
          puzzles!inner(themes)
        `)
        .eq('user_id', user);

      if (!attempts) return {};

      const themeStats = {};
      
      attempts.forEach(attempt => {
        if (attempt.puzzles?.themes) {
          attempt.puzzles.themes.forEach(theme => {
            if (!themeStats[theme]) {
              themeStats[theme] = { attempted: 0, solved: 0 };
            }
            themeStats[theme].attempted++;
            if (attempt.solved) {
              themeStats[theme].solved++;
            }
          });
        }
      });

      // Calculate percentages
      Object.keys(themeStats).forEach(theme => {
        const stat = themeStats[theme];
        stat.percentage = stat.attempted > 0 ? (stat.solved / stat.attempted) * 100 : 0;
      });

      return themeStats;
      
    } catch (error) {
      console.error('❌ Failed to get theme stats:', error);
      return {};
    }
  }

  async getPopularThemes(limit = 20) {
    try {
      // This would require a more complex query to count theme popularity
      // For now, return the themes from fetchPuzzleThemes
      return await this.fetchPuzzleThemes();
    } catch (error) {
      console.error('❌ Failed to get popular themes:', error);
      return [];
    }
  }

  // ===== OPENING COURSE METHODS =====

  /**
   * Get all available openings with optional filtering
   */
  async getOpenings(filters = {}) {
    try {
      const { category, difficulty, search, limit = 50 } = filters;
      
      console.log('🔍 Fetching openings with filters:', filters);

      let query = this.supabase
        .from('openings')
        .select(`
          *,
          opening_variations!inner(
            id,
            variation_name,
            move_count,
            is_main_line,
            frequency_score,
            notes,
            key_ideas
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

      console.log(`✅ Retrieved ${openings?.length || 0} openings`);
      return openings || [];

    } catch (error) {
      console.error('❌ Failed to fetch openings:', error);
      return [];
    }
  }

  /**
   * Get variations for a specific opening
   */
  async getOpeningVariations(openingId) {
    try {
      console.log('🔍 Fetching variations for opening:', openingId);

      const { data: variations, error } = await this.supabase
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

      console.log(`✅ Retrieved ${variations?.length || 0} variations`);
      return variations || [];

    } catch (error) {
      console.error('❌ Failed to fetch variations:', error);
      return [];
    }
  }

  /**
   * Get user's progress for a specific opening variation
   */
  async getOpeningProgress(variationId) {
    try {
      const user = await this.getCurrentUser();
      if (!user) {
        console.log('❌ No authenticated user');
        return null;
      }

      console.log('📊 Fetching opening progress:', { userId: user.id, variationId });

      const { data: progress, error } = await this.supabase
        .from('user_opening_progress')
        .select(`
          *,
          opening_variations!inner(
            variation_name,
            move_count,
            moves,
            moves_uci,
            openings!inner(
              name,
              eco_code,
              difficulty
            )
          )
        `)
        .eq('user_id', user.id)
        .eq('variation_id', variationId)
        .single();

      if (error && error.code !== 'PGRST116') { // Not found is OK
        throw error;
      }

      return progress;

    } catch (error) {
      console.error('❌ Failed to get opening progress:', error);
      return null;
    }
  }

  /**
   * Get all user's opening progress
   */
  async getAllOpeningProgress() {
    try {
      const user = await this.getCurrentUser();
      if (!user) return {};

      console.log('📊 Fetching all opening progress for user:', user.id);

      const { data: progress, error } = await this.supabase
        .from('user_opening_progress')
        .select(`
          *,
          opening_variations!inner(
            variation_name,
            move_count,
            openings!inner(
              name,
              eco_code,
              category,
              difficulty
            )
          )
        `)
        .eq('user_id', user.id)
        .order('last_practiced_at', { ascending: false });

      if (error) throw error;

      // Convert to map for easy lookup by variation ID
      const progressMap = {};
      if (progress) {
        progress.forEach(p => {
          progressMap[p.variation_id] = p;
        });
      }

      console.log(`✅ Retrieved progress for ${progress?.length || 0} variations`);
      return progressMap;

    } catch (error) {
      console.error('❌ Failed to get all opening progress:', error);
      return {};
    }
  }

  /**
   * Initialize user progress for a new opening variation
   */
  async initializeOpeningProgress(variationId) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      console.log('🆕 Initializing opening progress:', { userId: user.id, variationId });

      // Get variation details
      const { data: variation, error: variationError } = await this.supabase
        .from('opening_variations')
        .select('move_count')
        .eq('id', variationId)
        .single();

      if (variationError) throw variationError;

      // Initialize progress record
      const { data: progress, error } = await this.supabase
        .from('user_opening_progress')
        .upsert({
          user_id: user.id,
          variation_id: variationId,
          current_move_depth: 6, // Start with first 6 moves (3 for each side)
          max_move_depth: variation.move_count,
          mastery_level: 0,
          consecutive_correct: 0,
          total_practice_rounds: 0,
          is_completed: false,
          started_at: new Date().toISOString(),
          last_practiced_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,variation_id'
        })
        .select()
        .single();

      if (error) throw error;

      console.log('✅ Initialized opening progress:', progress.id);
      return progress;

    } catch (error) {
      console.error('❌ Failed to initialize opening progress:', error);
      return null;
    }
  }

  /**
   * Record an opening practice attempt
   */
  async recordOpeningAttempt(attemptData) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      const {
        variationId,
        moveDepth,
        attemptedMoves,
        correctMoves,
        isPerfect,
        timeTaken,
        practiceRound,
        mistakeMoves = []
      } = attemptData;

      console.log('📝 Recording opening attempt:', {
        userId: user.id,
        variationId,
        moveDepth,
        isPerfect,
        practiceRound
      });

      // Record the attempt
      const { data: attempt, error: attemptError } = await this.supabase
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

      // Update progress statistics
      await this.updateOpeningProgressStats(variationId);

      console.log('✅ Recorded opening attempt:', attempt.id);
      return attempt;

    } catch (error) {
      console.error('❌ Failed to record opening attempt:', error);
      return null;
    }
  }

  /**
   * Update opening progress statistics after an attempt
   */
  async updateOpeningProgressStats(variationId) {
    try {
      const user = await this.getCurrentUser();
      if (!user) return;

      console.log('🔄 Updating opening progress stats:', { userId: user.id, variationId });

      // Get recent attempts for this variation
      const { data: recentAttempts, error: attemptsError } = await this.supabase
        .from('user_opening_attempts')
        .select('is_perfect, created_at')
        .eq('user_id', user.id)
        .eq('variation_id', variationId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (attemptsError) throw attemptsError;

      if (!recentAttempts || recentAttempts.length === 0) return;

      // Calculate statistics
      const totalAttempts = recentAttempts.length;
      const perfectAttempts = recentAttempts.filter(a => a.is_perfect).length;
      const masteryLevel = Math.round((perfectAttempts / totalAttempts) * 100);

      // Calculate consecutive correct (from most recent backwards)
      let consecutiveCorrect = 0;
      for (const attempt of recentAttempts) {
        if (attempt.is_perfect) {
          consecutiveCorrect++;
        } else {
          break;
        }
      }

      // Update progress record
      const { error: updateError } = await this.supabase
        .from('user_opening_progress')
        .update({
          mastery_level: masteryLevel,
          consecutive_correct: consecutiveCorrect,
          total_practice_rounds: totalAttempts,
          last_practiced_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('variation_id', variationId);

      if (updateError) throw updateError;

      console.log(`✅ Updated stats: ${masteryLevel}% mastery, ${consecutiveCorrect} consecutive`);

    } catch (error) {
      console.error('❌ Failed to update opening progress stats:', error);
    }
  }

  /**
   * Update opening progress (for advancing to next move depth)
   */
  async updateOpeningProgress(variationId, updates) {
    try {
      const user = await this.getCurrentUser();
      if (!user) throw new Error('Not authenticated');

      console.log('🔄 Updating opening progress:', { userId: user.id, variationId, updates });

      const { error } = await this.supabase
        .from('user_opening_progress')
        .update({
          ...updates,
          last_practiced_at: new Date().toISOString()
        })
        .eq('user_id', user.id)
        .eq('variation_id', variationId);

      if (error) throw error;

      console.log('✅ Updated opening progress');
      return true;

    } catch (error) {
      console.error('❌ Failed to update opening progress:', error);
      return false;
    }
  }

  /**
   * Get recent opening attempts for a variation and move depth
   */
  async getRecentOpeningAttempts(variationId, moveDepth, limit = 10) {
    try {
      const user = await this.getCurrentUser();
      if (!user) return [];

      console.log('📊 Fetching recent attempts:', { userId: user.id, variationId, moveDepth, limit });

      const { data: attempts, error } = await this.supabase
        .from('user_opening_attempts')
        .select('*')
        .eq('user_id', user.id)
        .eq('variation_id', variationId)
        .eq('move_depth', moveDepth)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      console.log(`✅ Retrieved ${attempts?.length || 0} recent attempts`);
      return attempts || [];

    } catch (error) {
      console.error('❌ Failed to get recent attempts:', error);
      return [];
    }
  }

  /**
   * Check if user should advance to next move depth
   */
  async checkAdvancementCriteria(variationId, currentMoveDepth) {
    try {
      const recentAttempts = await this.getRecentOpeningAttempts(variationId, currentMoveDepth, 7);
      
      if (recentAttempts.length < 7) {
        return { shouldAdvance: false, reason: 'Need to complete 7 practice rounds' };
      }

      const successfulAttempts = recentAttempts.filter(a => a.is_perfect).length;
      const successRate = (successfulAttempts / recentAttempts.length) * 100;

      console.log(`📊 Advancement check: ${successfulAttempts}/7 perfect (${Math.round(successRate)}%)`);

      if (successfulAttempts >= 5) { // 5 out of 7 success rate
        return { shouldAdvance: true, successRate };
      } else {
        return { shouldAdvance: false, reason: `Need 5/7 success rate (currently ${successfulAttempts}/7)` };
      }

    } catch (error) {
      console.error('❌ Failed to check advancement criteria:', error);
      return { shouldAdvance: false, reason: 'Error checking criteria' };
    }
  }

  /**
   * Advance user to next move depth in opening sequence
   */
  async advanceToNextMoveDepth(variationId) {
    try {
      const progress = await this.getOpeningProgress(variationId);
      if (!progress) {
        throw new Error('No progress found for this variation');
      }

      const newMoveDepth = Math.min(
        progress.current_move_depth + 2, // Add 2 moves (one for each side)
        progress.max_move_depth
      );

      console.log('⬆️ Advancing move depth:', {
        variationId,
        from: progress.current_move_depth,
        to: newMoveDepth
      });

      const isCompleted = newMoveDepth >= progress.max_move_depth;

      const success = await this.updateOpeningProgress(variationId, {
        current_move_depth: newMoveDepth,
        consecutive_correct: progress.consecutive_correct + 1,
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null
      });

      if (success) {
        console.log(`✅ Advanced to ${newMoveDepth} moves${isCompleted ? ' (COMPLETED!)' : ''}`);
        return { newMoveDepth, isCompleted };
      }

      return null;

    } catch (error) {
      console.error('❌ Failed to advance move depth:', error);
      return null;
    }
  }

  /**
   * Get opening categories for filtering
   */
  async getOpeningCategories() {
    try {
      const { data: categories, error } = await this.supabase
        .from('openings')
        .select('category')
        .eq('is_active', true);

      if (error) throw error;

      const uniqueCategories = [...new Set(categories?.map(c => c.category) || [])];
      console.log('✅ Retrieved opening categories:', uniqueCategories);
      
      return uniqueCategories;

    } catch (error) {
      console.error('❌ Failed to get categories:', error);
      return ['Open', 'Semi-Open', 'Closed', 'Flank']; // Fallback
    }
  }

  /**
   * Get opening statistics for the user
   */
  async getOpeningStats() {
    try {
      const user = await this.getCurrentUser();
      if (!user) return null;

      console.log('📈 Fetching opening statistics for user:', user.id);

      // Get basic progress stats
      const { data: progress, error: progressError } = await this.supabase
        .from('user_opening_progress')
        .select(`
          *,
          opening_variations!inner(
            openings!inner(
              category,
              difficulty
            )
          )
        `)
        .eq('user_id', user.id);

      if (progressError) throw progressError;

      // Get attempt stats
      const { data: attempts, error: attemptsError } = await this.supabase
        .from('user_opening_attempts')
        .select('is_perfect, time_taken, created_at')
        .eq('user_id', user.id)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()); // Last 30 days

      if (attemptsError) throw attemptsError;

      // Calculate statistics
      const stats = {
        totalVariations: progress?.length || 0,
        completedVariations: progress?.filter(p => p.is_completed).length || 0,
        averageMastery: progress?.length > 0 
          ? Math.round(progress.reduce((sum, p) => sum + p.mastery_level, 0) / progress.length)
          : 0,
        totalPracticeTime: attempts?.reduce((sum, a) => sum + (a.time_taken || 0), 0) || 0,
        averageAccuracy: attempts?.length > 0
          ? Math.round((attempts.filter(a => a.is_perfect).length / attempts.length) * 100)
          : 0,
        practiceStreak: await this.calculateOpeningStreak(),
        byCategory: {},
        byDifficulty: {}
      };

      // Group by category and difficulty
      if (progress) {
        progress.forEach(p => {
          const category = p.opening_variations.openings.category;
          const difficulty = p.opening_variations.openings.difficulty;

          if (!stats.byCategory[category]) {
            stats.byCategory[category] = { total: 0, completed: 0, mastery: 0 };
          }
          if (!stats.byDifficulty[difficulty]) {
            stats.byDifficulty[difficulty] = { total: 0, completed: 0, mastery: 0 };
          }

          stats.byCategory[category].total++;
          stats.byDifficulty[difficulty].total++;
          stats.byCategory[category].mastery += p.mastery_level;
          stats.byDifficulty[difficulty].mastery += p.mastery_level;

          if (p.is_completed) {
            stats.byCategory[category].completed++;
            stats.byDifficulty[difficulty].completed++;
          }
        });
      }

      // Calculate average mastery per category/difficulty
      Object.keys(stats.byCategory).forEach(category => {
        const cat = stats.byCategory[category];
        cat.averageMastery = cat.total > 0 ? Math.round(cat.mastery / cat.total) : 0;
        delete cat.mastery; // Remove intermediate calculation
      });

      Object.keys(stats.byDifficulty).forEach(difficulty => {
        const diff = stats.byDifficulty[difficulty];
        diff.averageMastery = diff.total > 0 ? Math.round(diff.mastery / diff.total) : 0;
        delete diff.mastery; // Remove intermediate calculation
      });

      console.log('✅ Calculated opening statistics');
      return stats;

    } catch (error) {
      console.error('❌ Failed to get opening statistics:', error);
      return null;
    }
  }

  /**
   * Calculate practice streak for openings
   */
  async calculateOpeningStreak() {
    try {
      const user = await this.getCurrentUser();
      if (!user) return 0;

      // Get practice days from attempts
      const { data: attempts, error } = await this.supabase
        .from('user_opening_attempts')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(365); // Last year

      if (error) throw error;

      if (!attempts || attempts.length === 0) return 0;

      // Get unique practice days
      const practiceDays = [...new Set(attempts.map(a => a.created_at.split('T')[0]))].sort();

      // Calculate current streak
      let streak = 0;
      const today = new Date();
      let checkDate = new Date(today);

      while (checkDate >= new Date(practiceDays[0])) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (practiceDays.includes(dateStr)) {
          streak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }

      return streak;

    } catch (error) {
      console.error('❌ Failed to calculate opening streak:', error);
      return 0;
    }
  }

  /**
   * Get spaced repetition queue for openings
   */
  async getSpacedRepetitionQueue(limit = 10) {
    try {
      const user = await this.getCurrentUser();
      if (!user) return [];

      console.log('🔄 Calculating spaced repetition queue for user:', user.id);

      // Get completed variations
      const { data: completedVariations, error } = await this.supabase
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

      // Calculate which are due for review
      const now = new Date();
      const dueForReview = [];

      if (completedVariations) {
        completedVariations.forEach(progress => {
          const lastPracticed = new Date(progress.last_practiced_at);
          const daysSinceLastPractice = Math.floor((now - lastPracticed) / (1000 * 60 * 60 * 24));
          
          // Calculate review interval based on mastery
          const interval = this.calculateReviewInterval(progress.mastery_level, progress.consecutive_correct);
          
          if (daysSinceLastPractice >= interval) {
            dueForReview.push({
              ...progress,
              daysSinceLastPractice,
              scheduledInterval: interval,
              priority: this.calculateReviewPriority(daysSinceLastPractice, interval, progress.mastery_level)
            });
          }
        });
      }

      // Sort by priority and limit
      dueForReview.sort((a, b) => b.priority - a.priority);
      
      console.log(`✅ Found ${dueForReview.length} openings due for review`);
      return dueForReview.slice(0, limit);

    } catch (error) {
      console.error('❌ Failed to get spaced repetition queue:', error);
      return [];
    }
  }

  /**
   * Calculate review interval for spaced repetition
   */
  calculateReviewInterval(masteryLevel, consecutiveCorrect) {
    const baseIntervals = [1, 3, 7, 14, 30, 60, 120]; // Days
    
    let intervalIndex = Math.min(consecutiveCorrect, baseIntervals.length - 1);
    
    // Adjust based on mastery level
    if (masteryLevel >= 95) {
      intervalIndex = Math.min(intervalIndex + 1, baseIntervals.length - 1);
    } else if (masteryLevel < 80) {
      intervalIndex = Math.max(intervalIndex - 1, 0);
    }
    
    return baseIntervals[intervalIndex];
  }

  /**
   * Calculate review priority
   */
  calculateReviewPriority(daysSincePractice, scheduledInterval, masteryLevel) {
    let priority = daysSincePractice / scheduledInterval; // Overdue factor
    
    // Boost priority for lower mastery
    if (masteryLevel < 85) {
      priority *= 1.5;
    }
    
    return Math.min(priority * 100, 1000);
  }
}

export default UserSystem;
