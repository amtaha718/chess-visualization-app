// src/auth-components.js
import React, { useState } from 'react';

// Login/Register Modal Component
const AuthModal = ({ isOpen, onClose, onAuthSuccess, userSystem }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let result;
      if (isLogin) {
        result = await userSystem.signIn(email, password);
      } else {
        result = await userSystem.signUp(email, password, displayName);
      }

      if (result.error) {
        setError(result.error);
      } else {
        onAuthSuccess(result.user);
        onClose();
        resetForm();
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError('');
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    resetForm();
  };

  if (!isOpen) return null;

  return (
    <div 
  onClick={(e) => {
    if (e.target === e.currentTarget) {
      console.log('🔍 Clicked outside modal - closing');
      onClose();
    }
  }}
  style={{
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  }}
>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        width: '100%',
        maxWidth: '400px',
        margin: '1rem'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ margin: 0, color: '#333' }}>
            {isLogin ? 'Sign In' : 'Create Account'}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '2px solid #ddd',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  boxSizing: 'border-box'
                }}
                placeholder="Your name"
              />
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              placeholder="your@email.com"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #ddd',
                borderRadius: '6px',
                fontSize: '1rem',
                boxSizing: 'border-box'
              }}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{
              backgroundColor: '#fee',
              border: '1px solid #fcc',
              color: '#c33',
              padding: '0.75rem',
              borderRadius: '6px',
              marginBottom: '1rem',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              backgroundColor: loading ? '#ccc' : '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '1rem',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              marginBottom: '1rem'
            }}
          >
            {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <span style={{ color: '#666' }}>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
          </span>
          <button
            onClick={switchMode}
            style={{
              background: 'none',
              border: 'none',
              color: '#4CAF50',
              cursor: 'pointer',
              textDecoration: 'underline',
              fontWeight: 'bold'
            }}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};

// User Profile Component
const UserProfile = ({ user, profile, onSignOut, onClose }) => {
  if (!user || !profile) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.7)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '2rem',
        borderRadius: '12px',
        boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
        width: '100%',
        maxWidth: '500px',
        margin: '1rem'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '1.5rem'
        }}>
          <h2 style={{ margin: 0, color: '#333' }}>Your Profile</h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '1.5rem',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            padding: '1rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            <div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Current Rating</div>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#4CAF50' }}>
                {profile.current_rating}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Best Rating</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' }}>
                {profile.highest_rating}
              </div>
            </div>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: '1fr 1fr',
            gap: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#4CAF50' }}>
                {profile.puzzles_solved}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Puzzles Solved</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FF9800' }}>
                {profile.puzzles_attempted}
              </div>
              <div style={{ fontSize: '0.9rem', color: '#666' }}>Total Attempts</div>
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#2196F3' }}>
              {profile.puzzles_attempted > 0 
                ? Math.round((profile.puzzles_solved / profile.puzzles_attempted) * 100)
                : 0}%
            </div>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>Accuracy</div>
          </div>

          <div style={{ fontSize: '0.9rem', color: '#666', textAlign: 'center' }}>
            <strong>Display Name:</strong> {profile.display_name || profile.username}
          </div>
        </div>

        <div style={{ 
          display: 'flex', 
          gap: '1rem',
          justifyContent: 'center'
        }}>
          <button
            onClick={onSignOut}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Sign Out
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold'
            }}
          >
            Continue Playing
          </button>
        </div>
      </div>
    </div>
  );
};

// Header component with auth state
const AuthHeader = ({ user, profile, onShowAuth, onShowProfile, onSignOut }) => {
  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '10px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      zIndex: 100
    }}>
      {user ? (
        <>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backgroundColor: 'rgba(255,255,255,0.9)',
            padding: '8px 12px',
            borderRadius: '20px',
            border: '1px solid #ddd'
          }}>
            <div style={{ fontSize: '0.9rem', color: '#666' }}>
              <strong>{profile?.display_name || 'Player'}</strong>
            </div>
            <div style={{
              backgroundColor: '#4CAF50',
              color: 'white',
              padding: '4px 8px',
              borderRadius: '12px',
              fontSize: '0.8rem',
              fontWeight: 'bold'
            }}>
              {profile?.current_rating || 1200}
            </div>
          </div>
          <button
            onClick={onShowProfile}
            style={{
              padding: '8px 16px',
              backgroundColor: '#2196F3',
              color: 'white',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 'bold'
            }}
          >
            Profile
          </button>
        </>
      ) : (
        <button
          onClick={onShowAuth}
          style={{
            padding: '8px 16px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '20px',
            cursor: 'pointer',
            fontSize: '0.9rem',
            fontWeight: 'bold'
          }}
        >
          Sign In
        </button>
      )}
    </div>
  );
};

export { AuthModal, UserProfile, AuthHeader };
