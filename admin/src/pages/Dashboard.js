import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Users, FileText, TrendingUp, ShieldCheck } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [detailedStats, setDetailedStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [res, detailedRes] = await Promise.all([
          api.get('/posts/stats'),
          api.get('/posts/stats/detailed')
        ]);
        setStats(res.data);
        setDetailedStats(detailedRes.data);
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };
    fetchStats();
  }, []);

  if (!stats || !detailedStats) return <div style={{ color: '#71717A', padding: '40px' }}>Loading analytics...</div>;

  const data = stats.campusBreakdown.map(c => ({
    name: c._id.toUpperCase(),
    value: c.count
  }));

  const COLORS = ['#FF453A', '#30D158', '#0A84FF', '#BF5AF2'];

  return (
    <div style={{ paddingBottom: '80px' }}>
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '8px', fontWeight: '800' }}>Dashboard</h2>
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
        <StatCard icon={<ShieldCheck color="#BF5AF2" />} label="DAU (24h)" value={stats.dau} />
      </div>


      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>
        {/* Activity Chart */}
        <div style={panelStyle}>
          <h3 style={panelTitleStyle}>Peak Activity (Last 24h)</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={detailedStats.hourlyActivity}>
                <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 10 }} dy={10} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ background: '#1A1A1A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                />
                <Bar dataKey="count" fill="#30D158" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Campus Breakdown */}
        <div style={panelStyle}>
          <h3 style={panelTitleStyle}>Campus Split</h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical">
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#71717A', fontSize: 12 }} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ background: '#1A1A1A', border: 'none' }} />
                <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Posts Section */}
      <div style={panelStyle}>
        <h3 style={panelTitleStyle}>Top Trending Posts (Last 7 Days)</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', textAlign: 'left' }}>
                <th style={thStyle}>Post Title</th>
                <th style={thStyle}>Author</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Campus</th>
                <th style={thStyle}>Votes</th>
                <th style={thStyle}>Comments</th>
              </tr>
            </thead>
            <tbody>
              {detailedStats.topPosts.map((post, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                  <td style={tdStyle}>{post.title}</td>
                  <td style={tdStyle}>
                    {post.author ? (
                      <div>
                        <div style={{ fontWeight: '600' }}>{post.author.name}</div>
                        <div style={{ fontSize: '11px', color: '#71717A' }}>{post.author.email}</div>
                      </div>
                    ) : (
                      <span style={{ color: '#71717A' }}>Unknown</span>
                    )}
                  </td>
                  <td style={tdStyle}><span style={badgeStyle(post.type)}>{post.type}</span></td>
                  <td style={tdStyle}>{post.campus.toUpperCase()}</td>
                  <td style={tdStyle}>🥔 {post.upvotes}</td>
                  <td style={tdStyle}>💬 {post.commentCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const panelStyle = {
  background: '#141414',
  padding: '32px',
  borderRadius: '24px',
  border: '1px solid rgba(255,255,255,0.08)'
};

const panelTitleStyle = { fontSize: '18px', fontWeight: '700', marginBottom: '24px' };

const thStyle = { padding: '12px', color: '#71717A', fontSize: '13px', fontWeight: '600' };
const tdStyle = { padding: '16px 12px', fontSize: '14px', color: '#E4E4E7' };

const badgeStyle = (type) => ({
  padding: '4px 8px',
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: '700',
  textTransform: 'uppercase',
  background: type === 'confess' ? '#EF444420' : '#0A84FF20',
  color: type === 'confess' ? '#EF4444' : '#0A84FF'
});

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
