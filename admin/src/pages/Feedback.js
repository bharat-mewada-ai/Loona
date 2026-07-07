import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { MessageSquare, Calendar, Mail, Filter } from 'lucide-react';

const Feedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState('all');

  const fetchFeedbacks = async () => {
    try {
      const { data } = await api.get('/feedback');
      setFeedbacks(data);
    } catch (err) {
      console.error('Failed to fetch feedbacks', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (filterCategory === 'all') return true;
    return fb.category?.toLowerCase() === filterCategory.toLowerCase();
  });

  const getCategoryColor = (category) => {
    switch (category?.toLowerCase()) {
      case 'bug':
        return { bg: 'rgba(255, 69, 58, 0.15)', text: '#FF453A', border: 'rgba(255, 69, 58, 0.3)' };
      case 'suggestion':
        return { bg: 'rgba(48, 209, 88, 0.15)', text: '#30D158', border: 'rgba(48, 209, 88, 0.3)' };
      case 'complaint':
        return { bg: 'rgba(255, 159, 10, 0.15)', text: '#FF9F0A', border: 'rgba(255, 159, 10, 0.3)' };
      default:
        return { bg: 'rgba(191, 90, 242, 0.15)', text: '#BF5AF2', border: 'rgba(191, 90, 242, 0.3)' };
    }
  };

  if (loading) {
    return <div style={{ color: '#71717A', padding: '40px' }}>Loading Feedbacks...</div>;
  }

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div>
          <h2 style={{ fontSize: '32px', marginBottom: '8px', fontWeight: '800', letterSpacing: '-1px' }}>User Feedback</h2>
          <p style={{ color: '#71717A' }}>Thoughts, feature requests, and bug reports sent by users from the app</p>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: '#141414', padding: '8px 16px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <Filter size={16} color="#71717A" />
          <span style={{ color: '#71717A', fontSize: '13px', fontWeight: 'bold', marginRight: '8px' }}>Category:</span>
          {['all', 'bug', 'suggestion', 'other'].map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              style={{
                background: filterCategory === cat ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                color: filterCategory === cat ? '#FFFFFF' : '#71717A',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s ease',
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {filteredFeedbacks.length === 0 ? (
        <div style={{ padding: '80px', textAlign: 'center', background: '#141414', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.08)' }}>
          <MessageSquare size={48} color="#71717A" style={{ marginBottom: '16px', opacity: 0.5 }} />
          <p style={{ color: '#71717A', fontSize: '16px' }}>No feedbacks found in this category.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
          {filteredFeedbacks.map((fb) => {
            const colors = getCategoryColor(fb.category);
            return (
              <div
                key={fb._id}
                style={{
                  background: '#141414',
                  padding: '24px',
                  borderRadius: '24px',
                  border: '1px solid rgba(255,255,255,0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px',
                  transition: 'transform 0.2s ease, border-color 0.2s ease',
                }}
              >
                {/* Header: User Info & Tag */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '32px', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      {fb.userId?.avatar || '🦊'}
                    </span>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: '#FFF', fontWeight: 'bold', fontSize: '15px' }}>{fb.userId?.name || 'Anonymous User'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#71717A', marginTop: '2px' }}>
                        <Mail size={12} />
                        <span>{fb.userId?.email || 'N/A'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span
                      style={{
                        background: colors.bg,
                        color: colors.text,
                        border: `1px solid ${colors.border}`,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                      }}
                    >
                      {fb.category || 'other'}
                    </span>
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
                  {fb.content}
                </div>

                {/* Footer Info */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', color: '#71717A', fontSize: '12px', gap: '6px' }}>
                  <Calendar size={12} />
                  <span>{new Date(fb.createdAt).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Feedback;
