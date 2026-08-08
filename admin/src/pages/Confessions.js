import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Calendar, Mail, Search, Trash2, ShieldAlert } from 'lucide-react';

const Confessions = () => {
  const [confessions, setConfessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchConfessions = async () => {
    try {
      const { data } = await api.get('/admin/confessions');
      setConfessions(data);
    } catch (err) {
      console.error('Failed to fetch confessions', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfessions();
  }, []);

  const handleDeleteConfession = async (id) => {
    if (!window.confirm('Are you sure you want to delete this confession permanently? This action cannot be undone.')) return;
    try {
      await api.delete(`/posts/${id}`);
      alert('Confession deleted successfully');
      setConfessions(prev => prev.filter(c => c._id !== id));
    } catch (err) {
      console.error('Failed to delete confession', err);
      alert('Failed to delete confession');
    }
  };

  const filteredConfessions = confessions.filter((c) => {
    const searchLower = searchTerm.toLowerCase();
    const titleMatch = c.title?.toLowerCase().includes(searchLower);
    const bodyMatch = c.body?.toLowerCase().includes(searchLower);
    const authorNameMatch = c.author?.name?.toLowerCase().includes(searchLower);
    const authorEmailMatch = c.author?.email?.toLowerCase().includes(searchLower);
    
    return titleMatch || bodyMatch || authorNameMatch || authorEmailMatch;
  });

  if (loading) {
    return <div style={{ color: '#71717A', padding: '40px' }}>Loading Confessions...</div>;
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '32px', marginBottom: '8px', fontWeight: '800', letterSpacing: '-1px' }}>Confession Directory</h2>
          <p style={{ color: '#71717A' }}>Audit anonymous confessions along with their real author identities</p>
        </div>

        {/* Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#141414', padding: '8px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Search size={16} color="#71717A" />
          <input
            type="text"
            placeholder="Search by confession content or author..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'transparent',
              color: '#FFF',
              border: 'none',
              outline: 'none',
              fontSize: '14px',
              width: '280px',
            }}
          />
        </div>
      </div>

      {filteredConfessions.length === 0 ? (
        <div style={{ padding: '80px', textAlign: 'center', background: '#141414', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <ShieldAlert size={48} color="#71717A" style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p style={{ color: '#71717A', fontSize: '16px' }}>No confessions found.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {filteredConfessions.map((c) => (
            <div
              key={c._id}
              style={{
                background: '#141414',
                padding: '24px',
                borderRadius: '24px',
                border: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Header: Author & Delete Button */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '32px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {c.author?.avatar || '👤'}
                  </span>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ color: '#FFF', fontWeight: 'bold', fontSize: '15px' }}>{c.author?.name || 'Deleted Account'}</span>
                      <span
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#EF4444',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '10px',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                        }}
                      >
                        Author Identity
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#71717A', marginTop: '2px' }}>
                      <Mail size={12} />
                      <span>{c.author?.email || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => handleDeleteConfession(c._id)}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#EF4444',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      padding: '8px 16px',
                      borderRadius: '12px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    <Trash2 size={14} /> Delete Confession
                  </button>
                </div>
              </div>

              {/* Body Content */}
              <div
                style={{
                  color: '#E4E4E7',
                  fontSize: '15px',
                  lineHeight: '1.6',
                  background: 'rgba(255, 255, 255, 0.02)',
                  padding: '16px 20px',
                  borderRadius: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.04)',
                  wordBreak: 'break-word',
                }}
              >
                {c.title ? (
                  <>
                    <div style={{ fontWeight: 'bold', marginBottom: '8px', color: '#FFF' }}>{c.title}</div>
                    {c.body && <div style={{ color: '#A1A1AA' }}>{c.body}</div>}
                  </>
                ) : (
                  <div style={{ fontWeight: '600', color: '#FFF' }}>{c.body}</div>
                )}
                {c.image && (
                  <div style={{ marginTop: '12px' }}>
                    <img 
                      src={c.image} 
                      alt="Attachment" 
                      style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }} 
                    />
                  </div>
                )}
              </div>

              {/* Footer Info */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#71717A', fontSize: '12px' }}>
                <div style={{ display: 'flex', gap: '16px' }}>
                  <span>🥔 {c.upvotes || 0} Upvotes</span>
                  <span>💬 {c.commentCount || 0} Comments</span>
                  <span>🏫 {c.campus?.toUpperCase()} Campus</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Calendar size={12} />
                  <span>{new Date(c.createdAt).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Confessions;
