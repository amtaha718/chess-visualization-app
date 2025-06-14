// src/user-system.js - FIXED: Remove duplicate addUserProgress function

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
      console.log(`📚 Fetching puzzles from database`);
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
      
      console.log('🔍 Fetching user progress for puzzles:', puzzleIds.length);
      
      // Enhanced error handling for 406 errors
      const { data: progress, error } = await this.supabase
        .from('user_puzzle_progress')
        .select('puzzle_id, status, attempts_count, best_time, first_solved_at')
        .eq('user_id', userId)
        .in('puzzle_id', puzzleIds);
      
      if (error) {
        console.error('❌ Error fetching user progress:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        // Return puzzles without progress data instead of failing completely
        return puzzles.map(puzzle => ({
          ...puzzle,
          solved: false,
          attempted: false,
          bestTime: null,
          attemptCount: 0,
          firstSolvedAt: null
        }));
      }
      
      console.log('✅ Progress data fetched successfully:', progress?.length || 0, 'records');
      
      // Create a map for quick lookup
      const progressMap = new Map();
      if (progress && Array.isArray(progress)) {
        progress.forEach(p => {
          progressMap.set(p.puzzle_id, p);
        });
      }
      
      // Merge progress with puzzles using your schema
      return puzzles.map(puzzle => {
        const userProgress = progressMap.get(puzzle.id);
        return {
          ...puzzle,
          solved: userProgress?.status === 'solved' || false,
          attempted: userProgress?.attempts_count > 0 || false,
          bestTime: userProgress?.best_time || null,
          attemptCount: userProgress?.attempts_count || 0,
          firstSolvedAt: userProgress?.first_solved_at || null
        };
      });
      
    } catch (error) {
      console.error('❌ Error in addUserProgress:', error);
      
      // Always return puzzles even if progress fetch fails
      return puzzles.map(puzzle => ({
        ...puzzle,
        solved: false,
        attempted: false,
        bestTime: null,
        attemptCount: 0,
        firstSolvedAt: null
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
}

export default UserSystem;
