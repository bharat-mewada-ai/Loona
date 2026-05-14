import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { CheckCircle, Trash2 } from 'lucide-react';

const ReportedPosts = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReported = async () => {
    try {
      // In production, this needs the admin JWT
      const { data } = await api.get('/posts/reported');
      setPosts(data);
    } catch (err) {
      console.error('Failed to fetch reported posts', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReported();
  }, []);

  const handleDismiss = async (id) => {
    try {
      await api.patch(`/posts/${id}/dismiss-reports`);
      setPosts(posts.filter(p => p._id !== id));
    } catch (err) {
      alert('Failed to dismiss reports');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to PERMANENTLY delete this post?')) return;
    try {
      await api.delete(`/posts/${id}`);
      setPosts(posts.filter(p => p._id !== id));
    } catch (err) {
      alert('Failed to delete post');
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>Moderation Queue</h2>
        <p style={{ color: '#71717A' }}>Review content reported by students</p>
      </div>

      {loading ? (
        <div style={{ color: '#71717A' }}>Loading reports...</div>
      ) : posts.length === 0 ? (
        <div style={{
          padding: '80px', textAlign: 'center', background: '#141414', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)'
        }}>
          <CheckCircle size={48} color="#30D158" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '20px', color: '#FFFFFF' }}>All clear!</h3>
          <p style={{ color: '#71717A' }}>No pending reports to review.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {posts.map(post => (
            <div key={post._id} style={{
              background: '#141414',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.08)',
              overflow: 'hidden'
            }}>
              <div style={{ padding: '24px', display: 'flex', gap: '24px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                    <span style={{
                      background: 'rgba(255, 69, 58, 0.1)',
                      color: '#FF453A',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}>{post.reportCount} REPORTS</span>
                    <span style={{ color: '#71717A', fontSize: '12px' }}>{post.campus.toUpperCase()}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <div style={{ width: '24px', height: '24px', borderRadius: '12px', background: '#222', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>{post.author?.avatar || '👤'}</div>
                    <span style={{ color: '#FFF', fontSize: '13px', fontWeight: '600' }}>{post.author?.name || 'Unknown User'}</span>
                    <span style={{ color: '#71717A', fontSize: '12px' }}>({post.author?.email})</span>
                  </div>

                  <h4 style={{ fontSize: '18px', marginBottom: '12px' }}>{post.title}</h4>
                  {post.content && <p style={{ color: '#A1A1AA', fontSize: '14px', lineHeight: '1.5', marginBottom: '16px' }}>{post.content}</p>}
                  
                  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '12px', padding: '16px' }}>
                    <h5 style={{ fontSize: '11px', color: '#71717A', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '1px' }}>REPORTS DETAIL:</h5>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {post.reports.map((r, i) => (
                        <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#FFF', fontSize: '12px' }}>{r.reason}</span>
                          <span style={{ color: '#71717A', fontSize: '10px' }}>by {r.reporter?.name || 'Anon'}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {post.image && (
                  <div style={{ width: '200px', height: '150px', borderRadius: '12px', overflow: 'hidden' }}>
                    <img src={post.image} alt="Reported content" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.02)',
                padding: '16px 24px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px'
              }}>
                <button 
                  onClick={() => handleDismiss(post._id)}
                  style={{
                    background: 'transparent', color: '#71717A', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <CheckCircle size={16} /> Dismiss
                </button>
                <button 
                  onClick={() => handleDelete(post._id)}
                  style={{
                    background: 'rgba(255, 69, 58, 0.1)', color: '#FF453A', padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
                    display: 'flex', alignItems: 'center', gap: '8px'
                  }}
                >
                  <Trash2 size={16} /> Delete Post
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportedPosts;
