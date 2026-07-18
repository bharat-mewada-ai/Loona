import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';
import { Clock, Search, Wifi, WifiOff, RefreshCw } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeAgo = (dateStr) => {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs  = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1)   return '🟢 Just now';
  if (mins < 60)  return `${mins}m ago`;
  if (hrs  < 24)  return `${hrs}h ago`;
  if (days < 7)   return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const isOnline = (dateStr) => {
  if (!dateStr) return false;
  return Date.now() - new Date(dateStr).getTime() < 5 * 60 * 1000; // within 5 mins
};

const campusColor = (campus) => ({
  ogi:      { bg: '#0A84FF20', text: '#0A84FF' },
  lnct:     { bg: '#34C75920', text: '#34C759' },
  oriental: { bg: '#FF9F0A20', text: '#FF9F0A' },
}[campus] || { bg: '#71717A20', text: '#71717A' });

// ─── Component ────────────────────────────────────────────────────────────────

const LastActive = () => {
  const [users, setUsers]       = useState([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetch, setLastFetch]   = useState(null);

  const fetchUsers = useCallback(async (q = '') => {
    setRefreshing(true);
    try {
      const res = await api.get(`/admin/users/last-active?limit=100${q ? `&q=${encodeURIComponent(q)}` : ''}`);
      setUsers(res.data);
      setLastFetch(new Date());
    } catch (err) {
      console.error('Failed to fetch last-active users', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search), 350);
    return () => clearTimeout(t);
  }, [search, fetchUsers]);

  const onlineUsers  = users.filter(u => isOnline(u.lastActive));
  const offlineUsers = users.filter(u => !isOnline(u.lastActive));

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '32px', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Clock size={28} color="#FF453A" />
            Last Active
          </h2>
          <p style={{ color: '#71717A', fontSize: '14px' }}>
            See when users last opened Loona &nbsp;·&nbsp;
            <span style={{ color: '#34C759' }}>🟢 {onlineUsers.length} online now</span>
            &nbsp;·&nbsp;
            {lastFetch && <span style={{ color: '#555' }}>Updated {timeAgo(lastFetch)}</span>}
          </p>
        </div>
        <button
          onClick={() => fetchUsers(search)}
          disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#141414', border: '1px solid #222', borderRadius: '12px',
            color: refreshing ? '#444' : '#FFF', padding: '10px 18px',
            fontWeight: '600', fontSize: '13px', cursor: 'pointer'
          }}
        >
          <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Refresh
        </button>
      </div>

      {/* Search */}
      <div style={{
        background: '#141414', padding: '20px', borderRadius: '20px',
        border: '1px solid rgba(255,255,255,0.08)', marginBottom: '32px'
      }}>
        <div style={{ position: 'relative' }}>
          <Search size={18} color="#71717A" style={{ position: 'absolute', left: '16px', top: '13px' }} />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: '100%', paddingLeft: '46px', height: '44px',
              background: '#0A0A0A', border: '1px solid #222', borderRadius: '12px',
              color: '#FFF', outline: 'none', fontSize: '14px', boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px', color: '#444' }}>
          <Clock size={36} style={{ marginBottom: '12px', opacity: 0.3 }} />
          <p>Loading activity…</p>
        </div>
      ) : users.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px', color: '#71717A' }}>
          <WifiOff size={36} style={{ marginBottom: '12px', opacity: 0.4 }} />
          <p>No users found.</p>
        </div>
      ) : (
        <>
          {/* Online Now Section */}
          {onlineUsers.length > 0 && (
            <Section title={`🟢 Online Now (${onlineUsers.length})`} color="#34C759">
              {onlineUsers.map(u => <UserRow key={u._id} user={u} />)}
            </Section>
          )}

          {/* Recently Active */}
          <Section title={`Recently Active (${offlineUsers.length})`} color="#71717A">
            {offlineUsers.map(u => <UserRow key={u._id} user={u} />)}
          </Section>
        </>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const Section = ({ title, color, children }) => (
  <div style={{ marginBottom: '40px' }}>
    <h4 style={{
      color, fontSize: '12px', fontWeight: '700', letterSpacing: '1px',
      textTransform: 'uppercase', marginBottom: '16px', paddingLeft: '4px'
    }}>{title}</h4>
    <div style={{ background: '#141414', borderRadius: '20px', border: '1px solid #1A1A1A', overflow: 'hidden' }}>
      {children}
    </div>
  </div>
);

const UserRow = ({ user }) => {
  const online  = isOnline(user.lastActive);
  const campus  = campusColor(user.campus);
  const ago     = timeAgo(user.lastActive);

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '16px',
      padding: '14px 20px', borderBottom: '1px solid #1A1A1A',
      transition: 'background 0.15s ease'
    }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      {/* Avatar + online dot */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: '42px', height: '42px', borderRadius: '50%',
          background: '#0A0A0A', border: '2px solid #222',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '22px'
        }}>
          {user.avatar || '👤'}
        </div>
        {online && (
          <div style={{
            position: 'absolute', bottom: '1px', right: '1px',
            width: '11px', height: '11px', borderRadius: '50%',
            background: '#34C759', border: '2px solid #141414'
          }} />
        )}
      </div>

      {/* Name + email */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#FFF', fontWeight: '600', fontSize: '14px' }}>
            {user.name}
          </span>
          {user.isVerified && <span style={{ fontSize: '12px' }}>✅</span>}
          {user.isBanned && (
            <span style={{
              fontSize: '10px', fontWeight: '700', color: '#FF3B30',
              background: '#FF3B3020', padding: '1px 6px', borderRadius: '4px'
            }}>BANNED</span>
          )}
          {user.campus && (
            <span style={{
              fontSize: '10px', fontWeight: '700', color: campus.text,
              background: campus.bg, padding: '1px 6px', borderRadius: '4px',
              textTransform: 'uppercase'
            }}>{user.campus}</span>
          )}
        </div>
        <div style={{ color: '#555', fontSize: '12px', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {user.email}
        </div>
      </div>

      {/* Potato balance */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ color: '#FFD700', fontWeight: '700', fontSize: '13px' }}>
          🥔 {user.potato || 0}
        </div>
      </div>

      {/* Last active timestamp */}
      <div style={{
        textAlign: 'right', flexShrink: 0, minWidth: '110px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
          {online
            ? <Wifi size={13} color="#34C759" />
            : <WifiOff size={13} color="#444" />
          }
          <span style={{
            color: online ? '#34C759' : '#71717A',
            fontSize: '13px', fontWeight: online ? '700' : '500'
          }}>
            {ago}
          </span>
        </div>
        {user.lastActive && (
          <div style={{ color: '#3A3A3A', fontSize: '11px', marginTop: '2px' }}>
            {new Date(user.lastActive).toLocaleString('en-IN', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LastActive;
