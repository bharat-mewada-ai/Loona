import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { CheckCircle, XCircle, Eye, MessageSquare } from 'lucide-react';

const ReportedChats = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const fetchReports = async () => {
    try {
      const { data } = await api.get('/admin/reported-chats');
      setReports(data);
    } catch (err) {
      console.error('Failed to fetch reported chats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleDismiss = async (reportId) => {
    try {
      await api.post(`/admin/reported-chats/${reportId}/dismiss`);
      setReports(reports.filter(r => r._id !== reportId));
      if (selectedReport?._id === reportId) {
        setSelectedReport(null);
      }
      alert('Report dismissed successfully');
    } catch (err) {
      alert('Failed to dismiss report');
    }
  };

  const handleResolve = async (reportId) => {
    try {
      await api.post(`/admin/reported-chats/${reportId}/resolve`);
      setReports(reports.filter(r => r._id !== reportId));
      if (selectedReport?._id === reportId) {
        setSelectedReport(null);
      }
      alert('Report marked as resolved');
    } catch (err) {
      alert('Failed to resolve report');
    }
  };

  const viewConversation = async (report) => {
    setSelectedReport(report);
    setLoadingMessages(true);
    try {
      const { data } = await api.get(`/admin/reported-chats/${report._id}/messages`);
      setMessages(data.messages);
    } catch (err) {
      alert('Failed to fetch conversation history');
      setSelectedReport(null);
    } finally {
      setLoadingMessages(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>Reported Chats</h2>
        <p style={{ color: '#71717A' }}>Moderation queue for reported conversations</p>
      </div>

      {loading ? (
        <div style={{ color: '#71717A' }}>Loading reports...</div>
      ) : reports.length === 0 ? (
        <div style={{
          padding: '80px', textAlign: 'center', background: '#141414', borderRadius: '24px', border: '1px dashed rgba(255,255,255,0.1)'
        }}>
          <CheckCircle size={48} color="#30D158" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '20px', color: '#FFFFFF' }}>All clear!</h3>
          <p style={{ color: '#71717A' }}>No pending chat reports to review.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: selectedReport ? '1fr 1fr' : '1fr', gap: '30px' }}>
          {/* Reports List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {reports.map(rep => (
              <div key={rep._id} style={{
                background: '#141414',
                borderRadius: '20px',
                border: selectedReport?._id === rep._id ? '1px solid #FF453A' : '1px solid rgba(255,255,255,0.08)',
                overflow: 'hidden',
                padding: '24px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                  <div>
                    <span style={{
                      background: 'rgba(255, 69, 58, 0.1)',
                      color: '#FF453A',
                      fontSize: '11px',
                      fontWeight: '700',
                      padding: '4px 8px',
                      borderRadius: '6px'
                    }}>CHAT REPORT</span>
                    <span style={{ color: '#71717A', fontSize: '12px', marginLeft: '10px' }}>
                      {new Date(rep.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: '#71717A', marginBottom: '6px' }}>REPORTED BY:</div>
                  <div style={{ color: '#FFF', fontWeight: '600' }}>
                    {rep.reporter?.name} <span style={{ color: '#71717A', fontWeight: '400' }}>({rep.reporter?.email})</span>
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: '#71717A', marginBottom: '6px' }}>REASON FOR REPORT:</div>
                  <div style={{ color: '#FF453A', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', padding: '12px 16px', borderRadius: '10px' }}>
                    "{rep.reason}"
                  </div>
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '13px', color: '#71717A', marginBottom: '6px' }}>PARTICIPANTS:</div>
                  <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                    {rep.chat?.participants?.map(p => (
                      <div key={p._id} style={{ background: '#0A0A0A', padding: '8px 12px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', border: '1px solid #222' }}>
                        <span style={{ fontSize: '16px' }}>{p.avatar || '👤'}</span>
                        <div>
                          <div style={{ fontSize: '12px', color: '#FFF', fontWeight: 'bold' }}>{p.name}</div>
                          <div style={{ fontSize: '10px', color: '#71717A' }}>{p.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px' }}>
                  <button
                    onClick={() => handleDismiss(rep._id)}
                    style={{ background: 'transparent', color: '#71717A', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', cursor: 'pointer' }}
                  >
                    <XCircle size={16} /> Dismiss
                  </button>
                  <button
                    onClick={() => handleResolve(rep._id)}
                    style={{ background: 'transparent', color: '#30D158', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', cursor: 'pointer' }}
                  >
                    <CheckCircle size={16} /> Resolve
                  </button>
                  <button
                    onClick={() => viewConversation(rep)}
                    style={{ background: '#FF453A', color: '#FFF', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', cursor: 'pointer' }}
                  >
                    <Eye size={16} /> View Conversation
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Conversation Inspector (Audited View) */}
          {selectedReport && (
            <div style={{
              background: '#141414',
              borderRadius: '20px',
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '800px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', color: '#FFF', margin: 0 }}>Conversation Inspector</h3>
                  <span style={{ fontSize: '11px', color: '#FF453A', fontWeight: 'bold' }}>⚠️ ACCESS REGISTERED IN AUDIT LOG</span>
                </div>
                <button onClick={() => setSelectedReport(null)} style={{ background: 'none', border: 'none', color: '#71717A', cursor: 'pointer' }}>Close</button>
              </div>

              {loadingMessages ? (
                <div style={{ color: '#71717A', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading conversation history...</div>
              ) : (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px', paddingRight: '8px', marginBottom: '20px' }}>
                  {messages.length === 0 ? (
                    <div style={{ color: '#71717A', textAlign: 'center', padding: '40px' }}>No messages sent in this conversation.</div>
                  ) : (
                    messages.map(msg => {
                      const isReporter = msg.senderId?._id === selectedReport.reporter?._id;
                      return (
                        <div key={msg._id} style={{
                          alignSelf: isReporter ? 'flex-end' : 'flex-start',
                          maxWidth: '75%',
                          background: isReporter ? '#FF453A' : '#222',
                          borderRadius: '12px',
                          padding: '12px',
                          color: '#FFF'
                        }}>
                          <div style={{ fontSize: '10px', color: isReporter ? 'rgba(255,255,255,0.6)' : '#71717A', marginBottom: '4px', fontWeight: 'bold' }}>
                            {msg.senderId?.name || 'Anonymous'}
                          </div>
                          <div style={{ fontSize: '14px', lineHeight: '1.4' }}>{msg.content}</div>
                          {msg.image && (
                            <img src={msg.image} alt="Chat attachment" style={{ width: '100%', borderRadius: '8px', marginTop: '8px' }} />
                          )}
                          <div style={{ fontSize: '9px', color: isReporter ? 'rgba(255,255,255,0.4)' : '#71717A', textAlign: 'right', marginTop: '4px' }}>
                            {new Date(msg.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '16px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => handleDismiss(selectedReport._id)}
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#FFF', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                >
                  Dismiss Report
                </button>
                <button
                  onClick={() => handleResolve(selectedReport._id)}
                  style={{ background: '#30D158', color: '#FFF', padding: '10px 20px', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
                >
                  Resolve & Close
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReportedChats;
