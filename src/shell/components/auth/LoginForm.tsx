import React, { useState } from 'react';

import { signInWithEmail, signInWithOAuth, signUp } from '../../../kernel/auth/auth';
import { useAuthStore } from '../../../kernel/stores/auth/auth.store';
import { themeVar } from '../../theme/theme-vars';

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  marginBottom: '16px',
  borderRadius: '8px',
  border: `1px solid ${themeVar('--sn-border')}`,
  background: themeVar('--sn-surface'),
  color: themeVar('--sn-text'),
  fontSize: '14px',
  boxSizing: 'border-box',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  borderRadius: '8px',
  border: 'none',
  background: themeVar('--sn-accent'),
  color: '#fff',
  fontSize: '14px',
  fontWeight: 600,
  cursor: 'pointer',
  marginBottom: '12px',
};

const googleButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: '#fff',
  color: '#000',
  border: '1px solid #ddd',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
};

const devButtonStyle: React.CSSProperties = {
  ...buttonStyle,
  background: 'rgba(255, 255, 255, 0.05)',
  border: `1px solid ${themeVar('--sn-border')}`,
  color: themeVar('--sn-text'),
  marginBottom: '8px',
};

const errorStyle: React.CSSProperties = {
  color: '#ef4444',
  fontSize: '14px',
  marginBottom: '16px',
};

const toggleStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: themeVar('--sn-accent'),
  cursor: 'pointer',
  fontSize: '14px',
  padding: 0,
};

export const LoginForm: React.FC = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const { isLoading, error, clearError } = useAuthStore();

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSignUp) {
      await signUp(email, password, displayName);
    } else {
      await signInWithEmail(email, password);
    }
  };

  const handleGoogleLogin = async () => {
    await signInWithOAuth('google');
  };

  const handleDevLogin = async (type: 'admin' | 'alice' | 'bob') => {
    const credentials = {
      admin: { email: 'woahitskimber@gmail.com', password: 'password123' },
      alice: { email: 'alice@example.com', password: 'password123' },
      bob: { email: 'bob@example.com', password: 'password123' },
    };
    const { email, password } = credentials[type];
    await signInWithEmail(email, password);
  };

  return (
    <div className="sn-glass-heavy sn-neo sn-holo-border" style={{ maxWidth: '400px', margin: '0 auto', padding: '40px 20px', borderRadius: '12px' }}>
      <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>
        {isSignUp ? 'Create an account' : 'Welcome back'}
      </h2>

      {error && <div style={errorStyle}>{error}</div>}

      <form onSubmit={handleEmailAuth}>
        {isSignUp && (
          <input
            type="text"
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            style={inputStyle}
            required
          />
        )}
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
          required
        />
        <button type="submit" style={buttonStyle} disabled={isLoading}>
          {isLoading ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
      </form>

      <div style={{ margin: '20px 0', textAlign: 'center', position: 'relative' }}>
        <hr style={{ border: 0, borderTop: `1px solid ${themeVar('--sn-border')}` }} />
        <span style={{ 
          position: 'absolute', 
          top: '50%', 
          left: '50%', 
          transform: 'translate(-50%, -50%)', 
          background: themeVar('--sn-bg'), 
          padding: '0 10px',
          fontSize: '12px',
          color: 'rgba(255,255,255,0.5)'
        }}>
          OR
        </span>
      </div>

      <button onClick={handleGoogleLogin} style={googleButtonStyle} disabled={isLoading}>
        <svg width="18" height="18" viewBox="0 0 18 18">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71a5.41 5.41 0 01-.282-1.71c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.443 2.05 0 5.042l3.007 2.332C3.712 5.164 5.696 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>

      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px' }}>
        {isSignUp ? (
          <>
            Already have an account?{' '}
            <button 
              style={toggleStyle} 
              onClick={() => { setIsSignUp(false); clearError(); }}
            >
              Sign In
            </button>
          </>
        ) : (
          <>
            Don't have an account?{' '}
            <button 
              style={toggleStyle} 
              onClick={() => { setIsSignUp(true); clearError(); }}
            >
              Sign Up
            </button>
          </>
        )}
      </div>

      {!isSignUp && (
        <div style={{ marginTop: '40px', padding: '20px', border: `1px dashed ${themeVar('--sn-border')}`, borderRadius: '12px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '16px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Development Access
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button 
              onClick={() => handleDevLogin('admin')} 
              style={{ ...devButtonStyle, background: themeVar('--sn-accent'), border: 'none' }} 
              disabled={isLoading}
            >
              Kimber (Admin)
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button 
                onClick={() => handleDevLogin('alice')} 
                style={devButtonStyle} 
                disabled={isLoading}
              >
                Alice (Dev)
              </button>
              <button 
                onClick={() => handleDevLogin('bob')} 
                style={devButtonStyle} 
                disabled={isLoading}
              >
                Bob (Dev)
              </button>
            </div>
          </div>
          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginTop: '8px', textAlign: 'center' }}>
            Bypasses password for local development
          </div>
        </div>
      )}
    </div>
  );
};
