import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { ShieldAlert, Search } from 'lucide-react';

const UserManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [potatoAdjustment, setPotatoAdjustment] = useState('');

  useEffect(() => {
    if (!searchTerm) {
      setResults([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get(`/admin/users/search?q=${searchTerm}`);
        setResults(res.data);
        setSelectedUser(null); // Reset user detail view to show new search results
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const handleSearch = async () => {
    if (!searchTerm) return;
    setLoading(true);
    try {
      const res = await api.get(`/admin/users/search?q=${searchTerm}`);
      setResults(res.data);
      setSelectedUser(null);
    } catch (err) {
      alert('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustPotatoes = async () => {
    if (!potatoAdjustment || isNaN(potatoAdjustment)) {
      alert('Please enter a valid number');
      return;
    }
    try {
      const res = await api.post(`/admin/users/${selectedUser.user._id}/adjust-potatoes`, {
        amount: Number(potatoAdjustment)
      });
      alert(res.data.message);
      setPotatoAdjustment('');
      setSelectedUser({
        ...selectedUser,
        user: {
          ...selectedUser.user,
          potato: res.data.potato
        }
      });
    } catch (err) {
      alert('Failed to adjust potatoes');
    }
  };

  const fetchDetails = async (userId) => {
    setLoading(true);
    try {
      const res = await api.get(`/admin/users/${userId}/details`);
      setSelectedUser(res.data);
    } catch (err) {
      alert('Failed to fetch details');
    } finally {
      setLoading(false);
    }
  };

  const handleBan = async (userId) => {
    if (!window.confirm('Ban this user permanently? They will lose all access.')) return;
    try {
      await api.post(`/admin/users/${userId}/ban`);
      alert('User banned');
      if (selectedUser) fetchDetails(userId);
    } catch (err) {
      alert('Failed to ban user');
    }
  };

  const handleVerify = async (userId) => {
    try {
      if (selectedUser?.user?.isVerified) {
        if (!window.confirm('Remove verification badge from this user?')) return;
        await api.post(`/admin/users/${userId}/unverify`);
        alert('User verification removed');
      } else {
        await api.post(`/admin/users/${userId}/verify`);
        alert('User verified');
      }
      if (selectedUser) fetchDetails(userId);
    } catch (err) {
      alert(selectedUser?.user?.isVerified ? 'Failed to remove verification' : 'Failed to verify user');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>User Management</h2>
        <p style={{ color: '#71717A' }}>Moderate user accounts and access</p>
      </div>

      <div style={{
        background: '#141414',
        padding: '24px',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.08)',
        marginBottom: '40px'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={20} color="#71717A" style={{ position: 'absolute', left: '16px', top: '14px' }} />
            <input 
              type="text" 
              placeholder="Search by Email or User ID..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              style={{ 
                width: '100%', 
                paddingLeft: '48px', 
                height: '48px', 
                background: '#0A0A0A', 
                border: '1px solid #222', 
                borderRadius: '12px',
                color: '#FFF',
                outline: 'none'
              }}
            />
          </div>
          <button 
            onClick={handleSearch}
            disabled={loading}
            style={{ 
              background: '#FF453A', 
              color: '#FFF', 
              padding: '0 24px', 
              borderRadius: '12px', 
              fontWeight: 'bold',
              cursor: 'pointer',
              border: 'none'
            }}
          >
            {loading ? '...' : 'Search'}
          </button>
        </div>
      </div>

      {!selectedUser && results.length > 0 && (
        <div style={{ background: '#141414', borderRadius: '24px', border: '1px solid #222', overflow: 'hidden' }}>
          {results.map(user => (
            <TouchableOpacity 
              key={user._id} 
              style={{ 
                padding: '16px 24px', 
                borderBottom: '1px solid #222', 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                cursor: 'pointer'
              }}
              onClick={() => fetchDetails(user._id)}
            >
              <div>
                <div style={{ fontWeight: 'bold', color: '#FFF' }}>{user.name} {user.isVerified && '✅'}</div>
                <div style={{ fontSize: '12px', color: '#71717A' }}>{user.email}</div>
              </div>
              <div style={{ color: '#FF453A', fontSize: '12px', fontWeight: 'bold' }}>VIEW DETAILS →</div>
            </TouchableOpacity>
          ))}
        </div>
      )}

      {selectedUser && (
        <div style={{ background: '#141414', padding: '32px', borderRadius: '24px', border: '1px solid #222' }}>
          <button onClick={() => setSelectedUser(null)} style={{ color: '#71717A', marginBottom: '24px', background: 'none', border: 'none', cursor: 'pointer' }}>← Back to results</button>
          
          <div style={{ display: 'flex', gap: '32px' }}>
             <div style={{ fontSize: '64px', background: '#0A0A0A', width: '120px', height: '120px', borderRadius: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid #FF453A' }}>
                {selectedUser.user.avatar}
             </div>
             <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: '28px', color: '#FFF' }}>{selectedUser.user.name}</h3>
                <p style={{ color: '#71717A' }}>{selectedUser.user.email}</p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                   <div style={{ background: '#0A0A0A', padding: '8px 16px', borderRadius: '10px', border: '1px solid #222' }}>
                      <div style={{ fontSize: '10px', color: '#71717A' }}>POTATOES</div>
                      <div style={{ color: '#FFD700', fontWeight: 'bold' }}>{selectedUser.user.potato}</div>
                   </div>
                   <div style={{ background: '#0A0A0A', padding: '8px 16px', borderRadius: '10px', border: '1px solid #222' }}>
                      <div style={{ fontSize: '10px', color: '#71717A' }}>CHATS</div>
                      <div style={{ color: '#FFF', fontWeight: 'bold' }}>{selectedUser.stats.chatsCount}</div>
                   </div>
                   <div style={{ background: '#0A0A0A', padding: '8px 16px', borderRadius: '10px', border: '1px solid #222' }}>
                      <div style={{ fontSize: '10px', color: '#71717A' }}>CAMPUS</div>
                      <div style={{ color: '#FFF', fontWeight: 'bold' }}>{selectedUser.user.campus?.toUpperCase()}</div>
                   </div>
                </div>
             </div>
             <div style={{ gap: '12px', display: 'flex', flexDirection: 'column' }}>
                <button onClick={() => handleBan(selectedUser.user._id)} style={{ background: selectedUser.user.isBanned ? '#34C759' : '#FF3B30', color: '#FFF', padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
                   {selectedUser.user.isBanned ? 'Unban User' : 'Ban User'}
                </button>
                 <button onClick={() => handleVerify(selectedUser.user._id)} style={{ background: '#0A0A0A', color: selectedUser.user.isVerified ? '#FF3B30' : '#34C759', padding: '12px 24px', borderRadius: '12px', fontWeight: 'bold', border: '1px solid #222', cursor: 'pointer' }}>
                   {selectedUser.user.isVerified ? 'Remove Verification' : 'Verify User'}
                 </button>
             </div>
          </div>

          <div style={{
            marginTop: '32px',
            background: '#0A0A0A',
            padding: '24px',
            borderRadius: '16px',
            border: '1px solid rgba(255,255,255,0.06)',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            maxWidth: '450px'
          }}>
             <h4 style={{ color: '#FFF', fontSize: '14px', fontWeight: 'bold', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Adjust User Potato Balance</h4>
             <div style={{ display: 'flex', gap: '12px' }}>
                <input 
                  type="number" 
                  placeholder="Amount (e.g. 50 or -25)" 
                  value={potatoAdjustment}
                  onChange={(e) => setPotatoAdjustment(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    background: '#141414',
                    border: '1px solid #222',
                    borderRadius: '10px',
                    color: '#FFF',
                    outline: 'none',
                    fontSize: '14px'
                  }}
                />
                <button 
                  onClick={handleAdjustPotatoes}
                  style={{
                    background: '#FFD700',
                    color: '#000',
                    padding: '0 20px',
                    borderRadius: '10px',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Apply
                </button>
             </div>
             <p style={{ color: '#71717A', fontSize: '11px', margin: 0 }}>
               Enter a positive number to add potatoes, or negative to deduct.
             </p>
          </div>

          <div style={{ marginTop: '40px', marginBottom: '40px' }}>
             <h4 style={{ color: '#FFF', marginBottom: '16px' }}>USER POSTS & CONFESSIONS</h4>
             {!selectedUser.posts || selectedUser.posts.length === 0 ? (
               <p style={{ color: '#71717A' }}>No posts or confessions found for this user.</p>
             ) : (
               <div style={{ background: '#0A0A0A', borderRadius: '16px', border: '1px solid #222', overflow: 'hidden' }}>
                 {selectedUser.posts.map(post => (
                   <div key={post._id} style={{ padding: '16px 20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                     <div style={{ flex: 1, paddingRight: '16px' }}>
                       <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                         <span style={{ 
                           padding: '2px 6px', 
                           borderRadius: '4px', 
                           fontSize: '10px', 
                           fontWeight: '700', 
                           textTransform: 'uppercase',
                           background: post.type === 'confess' ? '#EF444420' : '#0A84FF20',
                           color: post.type === 'confess' ? '#EF4444' : '#0A84FF' 
                         }}>
                           {post.type}
                         </span>
                         <span style={{ color: '#71717A', fontSize: '11px' }}>{new Date(post.createdAt).toLocaleDateString()}</span>
                       </div>
                       <div style={{ color: '#FFF', fontWeight: '600', fontSize: '14px' }}>{post.title}</div>
                       {post.body && <div style={{ color: '#71717A', fontSize: '12px', marginTop: '4px' }}>{post.body.substring(0, 100)}{post.body.length > 100 ? '...' : ''}</div>}
                     </div>
                     <div style={{ display: 'flex', gap: '16px', color: '#71717A', fontSize: '12px', fontWeight: 'bold' }}>
                       <span>🥔 {post.upvotes}</span>
                       <span>💬 {post.commentCount}</span>
                     </div>
                   </div>
                 ))}
               </div>
             )}
          </div>

          <div style={{ marginTop: '40px' }}>
             <h4 style={{ color: '#FFF', marginBottom: '16px' }}>MODERATION LOGS (Audit)</h4>
             {selectedUser.logs.length === 0 ? (
               <p style={{ color: '#71717A' }}>No previous moderation actions taken on this user.</p>
             ) : (
               <div style={{ background: '#0A0A0A', borderRadius: '16px', border: '1px solid #222' }}>
                  {selectedUser.logs.map(log => (
                    <div key={log._id} style={{ padding: '12px 20px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between' }}>
                       <div>
                          <span style={{ color: '#FF453A', fontWeight: 'bold', fontSize: '12px' }}>{log.action}</span>
                          <span style={{ color: '#71717A', marginLeft: '12px', fontSize: '12px' }}>by {log.performedBy?.name}</span>
                       </div>
                       <span style={{ color: '#71717A', fontSize: '12px' }}>{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  ))}
               </div>
             )}
          </div>
        </div>
      )}

      {!searchTerm && !selectedUser && (
        <div style={{ textAlign: 'center', padding: '60px', color: '#71717A' }}>
          <ShieldAlert size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p>Enter a specific User ID or Email to moderate.</p>
        </div>
      )}
    </div>
  );
};

const TouchableOpacity = ({ children, style, onClick }) => (
  <div onClick={onClick} style={{ ...style, cursor: 'pointer' }}>{children}</div>
);

export default UserManagement;
