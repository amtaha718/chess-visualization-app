// src/user-system.js - Modified to use Stockfish puzzles instead of Lichess

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

  // ===== STOCKFISH PUZZLE GENERATION =====
  
  async getPuzzlesForUser(difficulty = 'intermediate', limit = 50) {
    try {
      const user = await this.getCurrentUser();
      
      console.log('🎯 Generating Stockfish puzzles for user:', user?.id || 'guest');
      console.log('- Difficulty:', difficulty);
      console.log('- Requested:', limit);
      
      // Generate puzzles using Stockfish API
      const puzzles = await this.generateStockfishPuzzles(difficulty, limit);
      
      if (user) {
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

  async getPublicPuzzles(difficulty = 'intermediate', limit = 25) {
    // For guest users, generate Stockfish puzzles
    return this.generateStockfishPuzzles(difficulty, limit);
  }

  async generateStockfishPuzzles(difficulty, count) {
    try {
      console.log(`🐟 Generating ${count} Stockfish puzzles (${difficulty})`);
      
      const puzzles = [];
      
      // Generate puzzles in batches to avoid timeout
      const batchSize = 10;
      const batches = Math.ceil(count / batchSize);
      
      for (let batch = 0; batch < batches; batch++) {
        const batchCount = Math.min(batchSize, count - (batch * batchSize));
        console.log(`📦 Generating batch ${batch + 1}/${batches} (${batchCount} puzzles)`);
        
        const batchPromises = [];
        for (let i = 0; i < batchCount; i++) {
          batchPromises.push(this.generateSinglePuzzle(difficulty));
        }
        
        const batchPuzzles = await Promise.all(batchPromises);
        puzzles.push(...batchPuzzles.filter(p => p !== null));
        
        // Small delay between batches
        if (batch < batches - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      console.log(`✅ Generated ${puzzles.length} Stockfish puzzles`);
      return puzzles;
      
    } catch (error) {
      console.error('❌ Stockfish puzzle generation failed:', error);
      return [];
    }
  }

  async generateSinglePuzzle(difficulty) {
    try {
      const response = await fetch('/api/generate-puzzle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          difficulty,
          userRating: this.getDifficultyRating(difficulty)
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const puzzle = await response.json();
      
      // Ensure puzzle has the format your app expects
      return {
        id: puzzle.id,
        fen: puzzle.fen,
        moves: puzzle.moves,
        explanation: puzzle.explanation,
        ai_explanation: puzzle.ai_explanation || null,
        difficulty: puzzle.difficulty,
        rating: puzzle.rating,
        themes: puzzle.themes || ['tactics'],
        source: puzzle.source || 'stockfish'
      };
      
    } catch (error) {
      console.error('❌ Single puzzle generation failed:', error);
      return null;
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

  async addUserProgress(puzzles, userId) {
    try {
      // Get user's progress on these puzzle IDs (though they're generated, so likely none)
      // For now, just return puzzles with no progress since they're freshly generated
      return puzzles.map(puzzle => ({
        ...puzzle,
        solved: false,
        attempted: false,
        bestTime: null,
        attemptCount: 0
      }));
      
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

  // ===== PUZZLE ATTEMPTS (Keep existing implementation) =====
  
  async recordPuzzleAttempt(puzzleId, solved, timeTaken, movesTried = []) {
    try {
      const user = await this.getCurrentUser();
      console.log('🔍 Debug recordPuzzleAttempt:');
      console.log('- Current user:', user);
      console.log('- User ID:', user?.id);
      console.log('- Puzzle ID:', puzzleId);
      console.log('- Solved:', solved);
      
      if (!user) {
        console.log('❌ No user found - not recording attempt');
        return null;
      }

      const profile = await this.getUserProfile();
      const ratingBefore = profile?.current_rating || 1200;
      console.log('- Rating before:', ratingBefore);

      // For Stockfish puzzles, we'll create a simple rating change
      // since we don't have historical data
      const ratingChange = this.calculateStockfishRatingChange(solved, ratingBefore);
      const newRating = ratingBefore + ratingChange;

      // Update user's rating in profile
      await this.updateUserProfile({
        current_rating: newRating,
        puzzles_attempted: (profile?.puzzles_attempted || 0) + 1,
        puzzles_solved: (profile?.puzzles_solved || 0) + (solved ? 1 : 0)
      });

      console.log(`✅ Rating updated: ${ratingBefore} → ${newRating} (${ratingChange >= 0 ? '+' : ''}${ratingChange})`);
      
      return {
        newRating,
        ratingChange,
        attemptId: `stockfish_${Date.now()}`
      };
      
    } catch (error) {
      console.error('❌ Record puzzle attempt error:', error);
      return null;
    }
  }

  calculateStockfishRatingChange(solved, currentRating) {
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

  // ===== KEEP ALL OTHER EXISTING METHODS =====
  
  async getUserStats() {
    try {
      const user = await this.getCurrentUser();
      if (!user) return null;

      const profile = await this.getUserProfile();
      
      return {
        profile,
        recentHistory: [], // Stockfish puzzles don't have history yet
        weaknesses: [] // Could be implemented later
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
    // For Stockfish puzzles, we could cache these in memory
    // or implement a temporary storage solution
    console.log('💾 Caching AI explanation for Stockfish puzzle:', puzzleId);
    this.puzzleCache.set(`explanation_${puzzleId}`, aiExplanation);
  }
}

export default UserSystem;
