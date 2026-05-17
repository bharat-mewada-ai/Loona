import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { Activity, Cpu, Database, HardDrive, Terminal, AlertTriangle } from 'lucide-react';

const Developer = () => {
  const [health, setHealth] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [hRes, aRes, eRes] = await Promise.all([
        api.get('/admin/health'),
        api.get('/admin/analytics/summary'),
        api.get('/admin/errors')
      ]);
      setHealth(hRes.data);
      setAnalytics(aRes.data);
      setErrors(eRes.data);
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
      <div style={{ marginBottom: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '32px', marginBottom: '8px' }}>Developer Console</h2>
          <p style={{ color: '#71717A' }}>Live server health and system telemetry</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(50, 215, 75, 0.1)', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(50, 215, 75, 0.2)' }}>
          <div style={{ 
            width: '8px', 
            height: '8px', 
            background: '#32D74B', 
            borderRadius: '50%', 
            boxShadow: '0 0 10px #32D74B',
            animation: 'pulse 1.5s infinite' 
          }} />
          <span style={{ color: '#32D74B', fontSize: '12px', fontWeight: 'bold' }}>SERVER HEARTBEAT</span>
          <style>{`
            @keyframes pulse {
              0% { transform: scale(0.95); opacity: 0.7; }
              70% { transform: scale(1.1); opacity: 1; }
              100% { transform: scale(0.95); opacity: 0.7; }
            }
          `}</style>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
         <StatCard icon={<Cpu />} label="CPU LOAD" value={`${health.system.cpuLoad[0].toFixed(2)}`} color="#FF9F0A" />
         <StatCard icon={<Activity />} label="MEM USAGE" value={`${health.system.memoryUsage}%`} color="#32D74B" />
         <StatCard icon={<HardDrive />} label="UPTIME" value={`${(health.system.uptime / 3600).toFixed(1)}h`} color="#64D2FF" />
         <StatCard icon={<Database />} label="MONGODB" value={health.database.mongodb} color="#AF52DE" />
      </div>

      {/* Storage Overview */}
      <div style={{ marginBottom: '40px', background: 'rgba(255,255,255,0.02)', padding: '24px', borderRadius: '24px', border: '1px solid #222' }}>
         <h4 style={{ color: '#FFF', marginBottom: '16px', fontSize: '14px', fontWeight: 'bold', letterSpacing: '1px' }}>STORAGE OVERVIEW</h4>
         <div style={{ display: 'flex', gap: '32px' }}>
            <div style={{ flex: 1 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#71717A', fontSize: '12px' }}>CLOUDINARY (Media)</span>
                  <span style={{ color: '#FFF', fontSize: '12px' }}>{health.storage.cloudinary.usage} / {health.storage.cloudinary.limit} GB</span>
               </div>
               <div style={{ height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#32D74B', width: `${Math.min(parseFloat(health.storage.cloudinary.percent), 100)}%` }} />
               </div>
               <div style={{ marginTop: '4px', textAlign: 'right', color: '#32D74B', fontSize: '10px' }}>{health.storage.cloudinary.percent}% Used</div>
               {/* Extra Cloudinary stats */}
               <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                 <div style={{ flex: 1, background: '#141414', borderRadius: '12px', padding: '10px 14px', border: '1px solid #222' }}>
                   <div style={{ color: '#71717A', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px', marginBottom: '4px' }}>BANDWIDTH</div>
                   <div style={{ color: '#64D2FF', fontSize: '16px', fontWeight: 'bold' }}>{health.storage.cloudinary.bandwidthMB ?? '—'} <span style={{ fontSize: '10px', color: '#71717A' }}>MB</span></div>
                 </div>
                 <div style={{ flex: 1, background: '#141414', borderRadius: '12px', padding: '10px 14px', border: '1px solid #222' }}>
                   <div style={{ color: '#71717A', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px', marginBottom: '4px' }}>RESOURCES</div>
                   <div style={{ color: '#FF9F0A', fontSize: '16px', fontWeight: 'bold' }}>{health.storage.cloudinary.resources ?? '—'}</div>
                 </div>
                 <div style={{ flex: 1, background: '#141414', borderRadius: '12px', padding: '10px 14px', border: '1px solid #222' }}>
                   <div style={{ color: '#71717A', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px', marginBottom: '4px' }}>API CALLS</div>
                   <div style={{ color: '#AF52DE', fontSize: '16px', fontWeight: 'bold' }}>{health.storage.cloudinary.requests ?? '—'}</div>
                 </div>
               </div>
            </div>
            <div style={{ flex: 1 }}>
               <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: '#71717A', fontSize: '12px' }}>MONGODB (Data)</span>
                  <span style={{ color: '#FFF', fontSize: '12px' }}>{health.storage.mongodb.dataSize} MB Used</span>
               </div>
               <div style={{ height: '8px', background: '#222', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#AF52DE', width: `${Math.min((health.storage.mongodb.dataSize / 512 * 100), 100).toFixed(1)}%` }} />
               </div>
               <div style={{ marginTop: '4px', textAlign: 'right', color: '#AF52DE', fontSize: '10px' }}>
                  Limit: 512 MB ({(health.storage.mongodb.dataSize / 512 * 100).toFixed(1)}%)
               </div>
               <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                 <div style={{ flex: 1, background: '#141414', borderRadius: '12px', padding: '10px 14px', border: '1px solid #222' }}>
                   <div style={{ color: '#71717A', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px', marginBottom: '4px' }}>STORAGE SIZE</div>
                   <div style={{ color: '#32D74B', fontSize: '16px', fontWeight: 'bold' }}>{health.storage.mongodb.storageSize} <span style={{ fontSize: '10px', color: '#71717A' }}>MB</span></div>
                 </div>
                 <div style={{ flex: 1, background: '#141414', borderRadius: '12px', padding: '10px 14px', border: '1px solid #222' }}>
                   <div style={{ color: '#71717A', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.5px', marginBottom: '4px' }}>STATUS</div>
                   <div style={{ color: health.database.mongodb === 'Connected' ? '#32D74B' : '#FF453A', fontSize: '13px', fontWeight: 'bold' }}>{health.database.mongodb}</div>
                 </div>
               </div>
            </div>
         </div>
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

       {/* Crash Logs */}
       <div style={{ marginTop: '40px' }}>
          <h4 style={{ color: '#FFF', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
             <AlertTriangle size={18} color="#FF9F0A" /> RECENT APP CRASHES & ERRORS
          </h4>
          <div style={{ background: '#141414', borderRadius: '24px', border: '1px solid #222', overflow: 'hidden' }}>
             {errors.map(error => (
               <div key={error._id} style={{ padding: '20px 24px', borderBottom: '1px solid #222' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                     <span style={{ color: '#FF453A', fontWeight: 'bold', fontSize: '14px' }}>{error.message}</span>
                     <span style={{ color: '#71717A', fontSize: '12px' }}>{new Date(error.createdAt).toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginBottom: '12px' }}>
                     <span style={{ background: '#222', color: '#AAA', padding: '2px 8px', borderRadius: '4px', fontSize: '10px' }}>{error.platform.toUpperCase()}</span>
                     <span style={{ background: '#222', color: '#AAA', padding: '2px 8px', borderRadius: '4px', fontSize: '10px' }}>{error.component}</span>
                     {error.userId && <span style={{ color: '#0A84FF', fontSize: '10px' }}>User: {error.userId.name} ({error.userId.email})</span>}
                  </div>
                  <pre style={{ 
                    background: '#0A0A0A', 
                    padding: '16px', 
                    borderRadius: '12px', 
                    color: '#FF453A', 
                    fontSize: '11px', 
                    overflowX: 'auto',
                    border: '1px solid rgba(255, 69, 58, 0.1)',
                    maxHeight: '200px'
                  }}>
                    {error.stack || 'No stack trace provided'}
                  </pre>
                  {error.metadata?.componentStack && (
                    <details style={{ marginTop: '12px' }}>
                      <summary style={{ color: '#71717A', fontSize: '11px', cursor: 'pointer' }}>View Component Stack</summary>
                      <pre style={{ color: '#71717A', fontSize: '10px', marginTop: '8px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px' }}>
                        {error.metadata.componentStack}
                      </pre>
                    </details>
                  )}
               </div>
             ))}
             {errors.length === 0 && <p style={{ padding: '24px', color: '#71717A' }}>No crashes reported yet. Safe orbit!</p>}
          </div>
       </div>
    </div>
  );
};

export default Developer;
