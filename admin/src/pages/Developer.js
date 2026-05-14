import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Activity, Cpu, Database, HardDrive, Terminal } from 'lucide-react';

const Developer = () => {
  const [health, setHealth] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [hRes, aRes] = await Promise.all([
        api.get('/admin/health'),
        api.get('/admin/analytics/summary')
      ]);
      setHealth(hRes.data);
      setAnalytics(aRes.data);
    } catch (err) {
      console.error('Failed to fetch dev stats');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  if (loading || !health) return <div style={{ color: '#71717A' }}>Loading Mission Control...</div>;

  const StatCard = ({ icon, label, value, color }) => (
    <div style={{ background: '#141414', padding: '24px', borderRadius: '20px', border: '1px solid #222', flex: 1 }}>
       <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ background: `${color}20`, padding: '8px', borderRadius: '8px' }}>
             {React.cloneElement(icon, { color, size: 20 })}
          </div>
          <span style={{ color: '#71717A', fontSize: '12px', fontWeight: 'bold', letterSpacing: '1px' }}>{label}</span>
       </div>
       <div style={{ fontSize: '28px', color: '#FFF', fontWeight: 'bold' }}>{value}</div>
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: '40px' }}>
        <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>Developer Console</h2>
        <p style={{ color: '#71717A' }}>Live server health and system telemetry</p>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
         <StatCard icon={<Cpu />} label="CPU LOAD" value={`${health.system.cpuLoad[0].toFixed(2)}`} color="#FF9F0A" />
         <StatCard icon={<Activity />} label="MEM USAGE" value={`${health.system.memoryUsage}%`} color="#32D74B" />
         <StatCard icon={<HardDrive />} label="UPTIME" value={`${(health.system.uptime / 3600).toFixed(1)}h`} color="#64D2FF" />
         <StatCard icon={<Database />} label="MONGODB" value={health.database.mongodb} color="#AF52DE" />
      </div>

      <div style={{ display: 'flex', gap: '32px' }}>
         {/* Usage Analytics */}
         <div style={{ flex: 1 }}>
            <h4 style={{ color: '#FFF', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
               <Activity size={18} color="#FF453A" /> MOST USED SCREENS
            </h4>
            <div style={{ background: '#141414', borderRadius: '24px', border: '1px solid #222', overflow: 'hidden' }}>
               {analytics.screenViews.map(sv => (
                 <div key={sv.screen} style={{ padding: '16px 24px', borderBottom: '1px solid #222', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#FFF', textTransform: 'capitalize' }}>{sv.screen}</span>
                    <span style={{ background: '#FF453A20', color: '#FF453A', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>{sv.count} Views</span>
                 </div>
               ))}
               {analytics.screenViews.length === 0 && <p style={{ padding: '24px', color: '#71717A' }}>No analytics data yet.</p>}
            </div>
         </div>

         {/* Recent Audit Logs */}
         <div style={{ flex: 1.5 }}>
            <h4 style={{ color: '#FFF', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
               <Terminal size={18} color="#32D74B" /> LIVE AUDIT LOGS
            </h4>
            <div style={{ background: '#0A0A0A', borderRadius: '24px', border: '1px solid #222', overflow: 'hidden', fontSize: '13px' }}>
               {health.recentLogs.map(log => (
                 <div key={log._id} style={{ padding: '12px 20px', borderBottom: '1px solid #222', fontFamily: 'monospace' }}>
                    <span style={{ color: '#71717A' }}>[{new Date(log.createdAt).toLocaleTimeString()}]</span>
                    <span style={{ color: '#FF453A', margin: '0 8px', fontWeight: 'bold' }}>{log.action}</span>
                    <span style={{ color: '#32D74B' }}>by {log.performedBy?.name}</span>
                    <p style={{ color: '#AAA', marginTop: '4px', fontSize: '11px' }}>{log.details}</p>
                    {(log.metadata?.body || log.metadata?.image) && (
                      <div style={{ color: '#71717A', fontSize: '10px', marginTop: '4px', fontStyle: 'italic', background: 'rgba(255,255,255,0.02)', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        {log.metadata.body && <div style={{ marginBottom: log.metadata.image ? '8px' : '0' }}>Full Text: {log.metadata.body}</div>}
                        {log.metadata.image && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                             <span style={{ color: '#FF453A' }}>[IMAGE]</span>
                             <a href={log.metadata.image} target="_blank" rel="noreferrer" style={{ color: '#0A84FF', textDecoration: 'underline' }}>View Image</a>
                          </div>
                        )}
                      </div>
                    )}
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};

export default Developer;
