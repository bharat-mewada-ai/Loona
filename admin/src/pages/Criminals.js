import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Gavel, AlertTriangle, ShieldX } from 'lucide-react';

const Criminals = () => {
  const [criminals, setCriminals] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCriminals = async () => {
    try {
      const { data } = await api.get('/admin/criminals');
      setCriminals(data);
    } catch (err) {
      console.error('Failed to fetch criminal list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCriminals();
  }, []);

  const handleBan = async (userId) => {
    if (!window.confirm('Ban this user permanently?')) return;
    try {
      await api.post(`/admin/users/${userId}/ban`);
      alert('Criminal banned!');
      fetchCriminals();
    } catch (err) {
      alert('Action failed');
    }
  };

  if (loading) return <div style={{ color: '#71717A' }}>Loading leaderboard...</div>;

  return (
    <div>
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '8px', color: '#FF453A' }}>Criminal Records</h2>
        <p style={{ color: '#71717A' }}>Users with the highest total report count across all posts</p>
      </div>

      {criminals.length === 0 ? (
        <div style={{ padding: '80px', textAlign: 'center', background: '#141414', borderRadius: '24px' }}>
           <p style={{ color: '#71717A' }}>No criminals found. Campus is safe!</p>
        </div>
      ) : (
        <div style={{ background: '#141414', borderRadius: '24px', border: '1px solid #222', overflow: 'hidden' }}>
           <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ background: '#0A0A0A' }}>
                 <tr>
                    <th style={thS}>RANK</th>
                    <th style={thS}>USER</th>
                    <th style={thS}>TOTAL REPORTS</th>
                    <th style={thS}>REPORTED POSTS</th>
                    <th style={thS}>ACTIONS</th>
                 </tr>
              </thead>
              <tbody>
                 {criminals.map((c, i) => (
                   <tr key={c._id} style={{ borderBottom: '1px solid #222' }}>
                      <td style={tdS}>
                         <div style={{ fontSize: '20px', fontWeight: 'bold', color: i === 0 ? '#FFD700' : '#71717A' }}>
                            #{i + 1}
                         </div>
                      </td>
                      <td style={tdS}>
                         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <span style={{ fontSize: '24px' }}>{c.avatar}</span>
                            <div>
                               <div style={{ color: '#FFF', fontWeight: 'bold' }}>{c.name}</div>
                               <div style={{ fontSize: '11px', color: '#71717A' }}>{c.email}</div>
                            </div>
                         </div>
                      </td>
                      <td style={tdS}>
                         <div style={{ color: '#FF453A', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                            <AlertTriangle size={14} /> {c.totalReports} Reports
                         </div>
                         <div style={{ width: '120px', height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ 
                               height: '100%', 
                               width: `${Math.min(c.totalReports * 10, 100)}%`,
                               background: c.totalReports > 10 ? '#FF453A' : c.totalReports > 5 ? '#FF9F0A' : '#FFD60A'
                            }} />
                         </div>
                         <div style={{ fontSize: '9px', marginTop: '4px', color: c.totalReports > 10 ? '#FF453A' : '#71717A' }}>
                            {c.totalReports > 10 ? 'MAXIMUM THREAT' : c.totalReports > 5 ? 'HIGH RISK' : 'STALKING'}
                         </div>
                      </td>
                      <td style={tdS}>
                         <div style={{ color: '#FFF' }}>{c.reportedPosts} Posts</div>
                      </td>
                      <td style={tdS}>
                         {c.isBanned ? (
                           <span style={{ color: '#32D74B', fontSize: '12px', fontWeight: 'bold' }}>ALREADY BANNED</span>
                         ) : (
                           <button 
                             onClick={() => handleBan(c._id)}
                             style={{ 
                               background: 'rgba(255, 69, 58, 0.1)', 
                               color: '#FF453A', 
                               border: '1px solid #FF453A40', 
                               padding: '6px 12px', 
                               borderRadius: '8px',
                               fontSize: '12px',
                               fontWeight: 'bold',
                               cursor: 'pointer'
                             }}
                           >
                              <ShieldX size={14} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                              BAN PERMANENTLY
                           </button>
                         )}
                      </td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
      )}
    </div>
  );
};

const thS = { padding: '16px 24px', textAlign: 'left', color: '#71717A', fontSize: '11px', fontWeight: '900', letterSpacing: '1px' };
const tdS = { padding: '20px 24px' };

export default Criminals;
