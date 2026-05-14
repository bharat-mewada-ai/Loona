import React, { useState } from 'react';
import api from '../utils/api';
import { Megaphone, Send, Info } from 'lucide-react';

const Broadcast = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [campus, setCampus] = useState('all');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!title || !body) return;

    setLoading(true);
    setStatus(null);
    try {
      const { data } = await api.post('/admin/broadcast', { title, body, campus });
      setStatus({ type: 'success', message: data.message });
      setTitle('');
      setBody('');
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Failed to send broadcast' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '8px', fontWeight: '800' }}>Broadcast</h2>
        <p style={{ color: '#71717A' }}>Send push notifications to your users</p>
      </div>

      <div style={{
        background: '#141414',
        padding: '32px',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={labelStyle}>Target Campus</label>
            <select 
              value={campus} 
              onChange={(e) => setCampus(e.target.value)}
              style={inputStyle}
            >
              <option value="all">All Campuses</option>
              <option value="ogi">OGI</option>
              <option value="lnct">LNCT</option>
              <option value="oriental">Oriental</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={labelStyle}>Notification Title</label>
            <input 
              type="text" 
              placeholder="e.g. 🍛 New Bhandara nearby!" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle}
              maxLength={50}
              required
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={labelStyle}>Message Body</label>
            <textarea 
              placeholder="e.g. Free food alert at the main gate. Come fast!" 
              value={body}
              onChange={(e) => setBody(e.target.value)}
              style={{ ...inputStyle, minHeight: '120px', resize: 'vertical' }}
              maxLength={150}
              required
            />
          </div>

          <div style={{ 
            background: 'rgba(10, 132, 255, 0.05)', 
            padding: '16px', 
            borderRadius: '16px', 
            display: 'flex', 
            gap: '12px',
            border: '1px solid rgba(10, 132, 255, 0.1)'
          }}>
            <Info size={20} color="#0A84FF" style={{ flexShrink: 0 }} />
            <p style={{ fontSize: '13px', color: '#0A84FF', lineHeight: '1.5' }}>
              This will send a push notification to all users in the selected group who have notifications enabled. 
              Please use responsibly to avoid being marked as spam.
            </p>
          </div>

          {status && (
            <div style={{ 
              padding: '16px', 
              borderRadius: '12px', 
              fontSize: '14px', 
              fontWeight: '600',
              background: status.type === 'success' ? 'rgba(48, 209, 88, 0.1)' : 'rgba(255, 69, 58, 0.1)',
              color: status.type === 'success' ? '#30D158' : '#FF453A',
              border: `1px solid ${status.type === 'success' ? 'rgba(48, 209, 88, 0.2)' : 'rgba(255, 69, 58, 0.2)'}`
            }}>
              {status.message}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading || !title || !body}
            style={{
              marginTop: '12px',
              background: loading ? '#333' : '#FF453A',
              color: '#FFF',
              border: 'none',
              padding: '16px',
              borderRadius: '16px',
              fontSize: '16px',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s ease'
            }}
          >
            {loading ? 'Sending...' : <><Send size={18} /> Send Broadcast</>}
          </button>
        </form>
      </div>
    </div>
  );
};

const labelStyle = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#71717A',
  marginLeft: '4px'
};

const inputStyle = {
  background: '#0A0A0A',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '12px',
  padding: '14px 16px',
  color: '#FFFFFF',
  fontSize: '15px',
  outline: 'none',
  transition: 'border-color 0.2s ease'
};

export default Broadcast;
