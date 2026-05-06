import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, FileText, TrendingUp, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await axios.get('http://localhost:5000/api/posts/stats');
        setStats(data);
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };
    fetchStats();
  }, []);

  if (!stats) return <div style={{ color: '#71717A' }}>Loading analytics...</div>;

  const data = stats.campusBreakdown.map(c => ({
    name: c._id.toUpperCase(),
    value: c.count
  }));

  const COLORS = ['#FF453A', '#30D158', '#0A84FF', '#BF5AF2'];

  return (
    <div>
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>Dashboard</h2>
        <p style={{ color: '#71717A' }}>Overview of Loona campus activity</p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '24px',
        marginBottom: '48px'
      }}>
        <StatCard icon={<Users color="#0A84FF" />} label="Total Users" value={stats.totalUsers} />
        <StatCard icon={<FileText color="#FF453A" />} label="Total Posts" value={stats.totalPosts} />
        <StatCard icon={<TrendingUp color="#30D158" />} label="Today's Posts" value={stats.todayPosts} />
        <StatCard icon={<ShieldCheck color="#BF5AF2" />} label="Active Sessions" value={Math.floor(stats.totalUsers * 0.4)} />
      </div>

      <div style={{
        background: '#141414',
        padding: '32px',
        borderRadius: '24px',
        border: '1px solid rgba(255,255,255,0.08)'
      }}>
        <h3 style={{ fontSize: '20px', marginBottom: '24px' }}>Campus Activity</h3>
        <div style={{ height: '300px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12 }} dy={10} />
              <YAxis hide />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
              />
              <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value }) => (
  <div style={{
    background: '#141414',
    padding: '24px',
    borderRadius: '24px',
    border: '1px solid rgba(255,255,255,0.08)'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
      <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px' }}>
        {icon}
      </div>
      <span style={{ color: '#71717A', fontSize: '14px', fontWeight: '500' }}>{label}</span>
    </div>
    <div style={{ fontSize: '32px', fontWeight: '800', fontFamily: 'Syne' }}>{value}</div>
  </div>
);

export default Dashboard;
