// src/user-system.js
import { createClient } from '@supabase/supabase-js';

class UserSystem {
  constructor() {
    // Replace with your Supabase credentials
    const supabaseUrl = 'https://hwnpylgiiurhcftbmwzh.supabase.co';
    const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh3bnB5bGdpaXVyaGNmdGJtd3poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg4ODg2MDQsImV4cCI6MjA2NDQ2NDYwNH0.30vJugiZ3DWeTR53hU6R2sCrVqQ6kR-JaqKWi6RDILE';
    
    this.supabase = createClient(supabaseUrl, supabaseKey);
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

  // ===== PUZZLE PROGRESS =====
  
  async getPuzzlesForUser(difficulty = 'all', limit = 20) {
    try {
      const user = await this.getCurrentUser();
      
      if (!user) {
        // Guest user - return puzzles without progress tracking
        return await this.getPublicPuzzles(difficulty, limit);
      }

      // Get puzzles with user progress
      let query = this.supabase
        .from('puzzles')
        .select(`
          *,
          user_puzzle_progress (
            status,
            best_time,
            attempts_count,
            first_solved_at
          )
        `)
        .limit(limit);

      if (difficulty !== 'all') {
        query = query.eq('difficulty', difficulty);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Transform data to include progress info
      return data.map(puzzle => ({
        id: puzzle.id,
        fen: puzzle.fen,
        moves: puzzle.moves,
        explanation: puzzle.explanation,
        difficulty: puzzle.difficulty,
        rating: puzzle.rating,
        themes: puzzle.themes,
        // User progress info
        solved: puzzle.user_puzzle_progress?.[0]?.status === 'solved',
        attempted: puzzle.user_puzzle_progress?.[0]?.status !== 'not_attempted',
        bestTime: puzzle.user_puzzle_progress?.[0]?.best_time,
        attemptCount: puzzle.user_puzzle_progress?.[0]?.attempts_count || 0
      }));

    } catch (error) {
      console.error('❌ Get puzzles for user error:', error);
      return [];
    }
  }

  async getPublicPuzzles(difficulty = 'all', limit = 20) {
    try {
      let query = this.supabase
        .from('puzzles')
        .select('*')
        .limit(limit);

      if (difficulty !== 'all') {
        query = query.eq('difficulty', difficulty);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data.map(puzzle => ({
        id: puzzle.id,
        fen: puzzle.fen,
        moves: puzzle.moves,
        explanation: puzzle.explanation,
        difficulty: puzzle.difficulty,
        rating: puzzle.rating,
        themes: puzzle.themes,
        solved: false,
        attempted: false
      }));

    } catch (error) {
      console.error('❌ Get public puzzles error:', error);
      return [];
    }
  }

  // In user-system.js, replace the recordPuzzleAttempt function with this debug version:

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

    // Record the attempt
    console.log('📝 Attempting to insert into user_puzzle_attempts...');
    const { data: attemptData, error: attemptError } = await this.supabase
      .from('user_puzzle_attempts')
      .insert({
        user_id: user.id,
        puzzle_id: puzzleId,
        solved,
        time_taken: timeTaken,
        moves_tried: movesTried,
        rating_before: ratingBefore
      })
      .select()
      .single();

    if (attemptError) {
      console.error('❌ Insert error:', attemptError);
      console.error('Error details:', {
        code: attemptError.code,
        message: attemptError.message,
        details: attemptError.details,
        hint: attemptError.hint
      });
      throw attemptError;
    }

    console.log('✅ Attempt inserted:', attemptData);

    // Update user rating using database function
    console.log('📊 Calling update_user_rating function...');
    const { data: newRating, error: ratingError } = await this.supabase
      .rpc('update_user_rating', {
        p_user_id: user.id,
        p_puzzle_id: puzzleId,
        p_solved: solved,
        p_time_taken: timeTaken
      });

    if (ratingError) {
      console.error('❌ Rating update error:', ratingError);
      throw ratingError;
    }

    console.log('✅ New rating:', newRating);

    // Update puzzle progress
    console.log('📈 Updating puzzle progress...');
    const { error: progressError } = await this.supabase
      .from('user_puzzle_progress')
      .upsert({
        user_id: user.id,
        puzzle_id: puzzleId,
        status: solved ? 'solved' : 'attempted',
        best_time: solved ? timeTaken : null,
        attempts_count: 1,
        first_solved_at: solved ? new Date().toISOString() : null,
        last_attempted_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,puzzle_id',
        ignoreDuplicates: false
      });

    if (progressError) {
      console.error('❌ Progress update error:', progressError);
    }

    console.log('✅ Puzzle attempt recorded successfully');
    
    return {
      newRating,
      ratingChange: newRating - ratingBefore,
      attemptId: attemptData.id
    };

  } catch (error) {
    console.error('❌ Record puzzle attempt error:', error);
    return null;
  }
}

  // ===== STATISTICS =====
  
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
        .limit(50);

      // Get weakness analysis
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
}

export default UserSystem;
