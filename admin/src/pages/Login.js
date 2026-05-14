import React, { useState } from 'react';
import api from '../utils/api';
import { saveAuthToken } from '../utils/auth';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      // Note: We use the same auth endpoint as the main app, but we verify role after login
      const res = await api.post('/auth/login', { email, password });
      const { user, token } = res.data;
      
      if (user.role !== 'admin' && user.role !== 'moderator') {
        setError('Access Denied: You do not have staff privileges.');
        setLoading(false);
        return;
      }

      saveAuthToken(token);
      onLogin();
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div style={s.container}>
      <form style={s.card} onSubmit={handleSubmit}>
        <h1 style={s.title}>LOONA ADMIN</h1>
        <p style={s.subtitle}>Enter your credentials to access the dashboard</p>
        
        {error && <div style={s.error}>{error}</div>}
        
        <div style={s.inputGroup}>
          <label style={s.label}>Email Address</label>
          <input 
            type="email" 
            style={s.input} 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />
        </div>
        
        <div style={s.inputGroup}>
          <label style={s.label}>Password</label>
          <input 
            type="password" 
            style={s.input} 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
          />
        </div>
        
        <button type="submit" style={s.button} disabled={loading}>
          {loading ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

const s = {
  container: { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#050505' },
  card: { background: '#111', padding: '40px', borderRadius: '24px', border: '1px solid #222', width: '100%', maxWidth: '400px' },
  title: { color: '#FFF', fontSize: '32px', textAlign: 'center', marginBottom: '8px', letterSpacing: '2px' },
  subtitle: { color: '#666', fontSize: '14px', textAlign: 'center', marginBottom: '32px' },
  error: { background: '#FF453A20', color: '#FF453A', padding: '12px', borderRadius: '12px', marginBottom: '20px', fontSize: '13px', border: '1px solid #FF453A40' },
  inputGroup: { marginBottom: '20px' },
  label: { display: 'block', color: '#AAA', fontSize: '12px', marginBottom: '8px', fontWeight: 'bold' },
  input: { width: '100%', background: '#1A1A1A', border: '1px solid #333', borderRadius: '12px', padding: '12px', color: '#FFF', fontSize: '16px', outline: 'none' },
  button: { width: '100%', background: '#C94030', color: '#FFF', border: 'none', borderRadius: '12px', padding: '14px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }
};
