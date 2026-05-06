import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserX, UserCheck, ShieldAlert, Search } from 'lucide-react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, we'd have a get all users endpoint or search endpoint
    // For now, we'll fetch stats which includes totalUsers and maybe later add a user list endpoint
    setLoading(false);
  }, []);

  const handleBan = async (userId) => {
    if (!window.confirm('Ban this user permanently? They will lose all access.')) return;
    try {
      await axios.post(`http://localhost:5000/api/admin/users/${userId}/ban`);
      alert('User banned');
    } catch (err) {
      alert('Failed to ban user');
    }
  };

  const handleUnban = async (userId) => {
    try {
      await axios.post(`http://localhost:5000/api/admin/users/${userId}/unban`);
      alert('User unbanned');
    } catch (err) {
      alert('Failed to unban user');
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
        <div style={{ position: 'relative' }}>
          <Search size={20} color="#71717A" style={{ position: 'absolute', left: '16px', top: '14px' }} />
          <input 
            type="text" 
            placeholder="Search by Email or User ID..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '48px', height: '48px' }}
          />
        </div>
      </div>

      <div style={{ textAlign: 'center', padding: '60px', color: '#71717A' }}>
        <ShieldAlert size={40} style={{ marginBottom: '16px', opacity: 0.5 }} />
        <p>Enter a specific User ID or Email to moderate.</p>
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
           <button style={{ background: '#1A1A1A', color: '#FFF', padding: '12px 24px', borderRadius: '12px', fontSize: '14px', fontWeight: '600' }}>
             Find User
           </button>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
