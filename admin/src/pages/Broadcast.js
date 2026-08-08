import React, { useState, useCallback } from 'react';
import api from '../utils/api';
import { Megaphone, Send } from 'lucide-react';

const Broadcast = () => {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState('campus'); // 'campus' or 'individual'
  const [campus, setCampus] = useState('all');
  const [targetValue, setTargetValue] = useState(''); // ID or Email
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedBroadcast, setSelectedBroadcast] = useState(null);

  const fetchHistory = useCallback(async () => {
    try {
      const { data } = await api.get('/admin/broadcast/history');
      setHistory(data);
      if (data.length > 0 && !selectedBroadcast) {
        setSelectedBroadcast(data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch broadcast history');
    }
  }, [selectedBroadcast]);

  React.useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!title || !body) return;

    setLoading(true);
    setStatus(null);
    try {
      const payload = { title, body };
      if (targetType === 'campus') {
        payload.campus = campus;
      } else {
        if (targetValue.includes('@')) payload.targetEmail = targetValue;
        else payload.targetId = targetValue;
      }

      const { data } = await api.post('/admin/broadcast', payload);
      setStatus({ type: 'success', message: data.message });
      setTitle('');
      setBody('');
      setTargetValue('');
      await fetchHistory(); // Live update of history
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Failed to send broadcast' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '8px', fontWeight: '800' }}>Broadcast</h2>
        <p style={{ color: '#71717A' }}>Send push notifications to your users</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '32px', alignItems: 'start' }}>
        <div style={{
          background: '#141414',
          padding: '32px',
          borderRadius: '24px',
          border: '1px solid rgba(255,255,255,0.08)'
        }}>
          <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                type="button"
                onClick={() => setTargetType('campus')}
                style={targetType === 'campus' ? activeTabStyle : tabStyle}
              >
                Campus Wide
              </button>
              <button 
                type="button"
                onClick={() => setTargetType('individual')}
                style={targetType === 'individual' ? activeTabStyle : tabStyle}
              >
                Individual User
              </button>
            </div>

            {targetType === 'campus' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={labelStyle}>Target Campus</label>
                <select 
                  value={campus} 
                  onChange={(e) => setCampus(e.target.value)}
                  style={inputStyle}
                >
                  <option value="all">All Campuses</option>
                  <option value="ogi">OGI (Oriental)</option>
                  <option value="lnct">LNCT</option>
                </select>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={labelStyle}>User ID or Email</label>
                <input 
                  type="text" 
                  placeholder="e.g. 64b3f... or user@example.com" 
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  style={inputStyle}
                  required
                />
              </div>
            )}

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
              disabled={loading || !title || !body || (targetType === 'individual' && !targetValue)}
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
                gap: '10px'
              }}
            >
              {loading ? 'Sending...' : <><Send size={18} /> Send Broadcast</>}
            </button>
          </form>
        </div>

        {/* Broadcast History & Audience Tracking */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* 1. History List */}
          <div style={{
            background: '#141414',
            padding: '24px',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.08)',
            maxHeight: '350px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#FFF' }}>
               <Megaphone size={18} color="#FFD60A" /> BROADCAST HISTORY
            </h3>
            <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
               {history.length === 0 ? (
                 <p style={{ color: '#71717A', fontSize: '13px', margin: '20px 0', textAlign: 'center' }}>No broadcast history yet.</p>
               ) : (
                 history.map(b => {
                   const isSelected = selectedBroadcast && selectedBroadcast._id === b._id;
                   return (
                     <div key={b._id} 
                          onClick={() => setSelectedBroadcast(b)}
                          style={{ 
                            cursor: 'pointer', 
                            padding: '12px', 
                            background: isSelected ? 'rgba(255, 69, 58, 0.1)' : 'rgba(255,255,255,0.02)', 
                            borderRadius: '12px', 
                            border: isSelected ? '1px solid #FF453A' : '1px solid rgba(255,255,255,0.05)',
                            transition: 'all 0.2s'
                          }}>
                        <div style={{ color: '#FFF', fontSize: '13px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{b.metadata?.title || b.details}</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#71717A', fontSize: '10px', marginTop: '6px' }}>
                           <span>Reached: {b.metadata?.count || 0} users</span>
                           <span>{new Date(b.createdAt).toLocaleDateString()}</span>
                        </div>
                     </div>
                   );
                 })
               )}
            </div>
          </div>

          {/* 2. Target Audience for selected Broadcast */}
          <div style={{
            background: '#141414',
            padding: '24px',
            borderRadius: '24px',
            border: '1px solid rgba(255,255,255,0.08)',
            maxHeight: '400px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h3 style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '8px', color: '#FFF' }}>
               AUDIENCE REACHED
            </h3>
            {selectedBroadcast ? (
              <>
                <p style={{ fontSize: '12px', color: '#71717A', marginBottom: '16px' }}>
                   Broadcasted: "{selectedBroadcast.metadata?.title || 'Notification'}" to ({selectedBroadcast.metadata?.recipients?.length || 0}) users
                </p>
                <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '4px' }}>
                   {(!selectedBroadcast.metadata?.recipients || selectedBroadcast.metadata.recipients.length === 0) ? (
                     <p style={{ color: '#71717A', fontSize: '12px', textAlign: 'center', marginTop: '20px' }}>No users received this broadcast.</p>
                   ) : (
                     selectedBroadcast.metadata.recipients.map(u => (
                       <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(255,255,255,0.01)', borderRadius: '10px' }}>
                          <span style={{ fontSize: '18px' }}>{u.avatar || '👤'}</span>
                          <div style={{ overflow: 'hidden' }}>
                             <div style={{ color: '#FFF', fontSize: '12px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.name}</div>
                             <div style={{ color: '#71717A', fontSize: '9px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</div>
                          </div>
                       </div>
                     ))
                   )}
                </div>
              </>
            ) : (
              <p style={{ color: '#71717A', fontSize: '13px', margin: '40px 0', textAlign: 'center' }}>Select a broadcast to see who received it.</p>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

const labelStyle = { fontSize: '14px', fontWeight: '600', color: '#71717A', marginLeft: '4px' };
const inputStyle = { background: '#0A0A0A', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '14px 16px', color: '#FFFFFF', fontSize: '15px', outline: 'none' };
const tabStyle = { flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid #222', background: 'transparent', color: '#71717A', fontWeight: '600', cursor: 'pointer' };
const activeTabStyle = { ...tabStyle, background: '#FF453A20', color: '#FF453A', border: '1px solid #FF453A' };

export default Broadcast;
