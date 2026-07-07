import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ReportedPosts from './pages/ReportedPosts';
import UserManagement from './pages/UserManagement';
import Broadcast from './pages/Broadcast';
import Criminals from './pages/Criminals';
import Developer from './pages/Developer';
import Login from './pages/Login';
import ReportedChats from './pages/ReportedChats';
import Feedback from './pages/Feedback';
import Sidebar from './components/Sidebar';
import { isStaff as checkIsStaff, clearAuthToken } from './utils/auth';

function App() {
  const [authenticated, setAuthenticated] = useState(null);

  useEffect(() => {
    setAuthenticated(!!checkIsStaff());
  }, []);

  const handleLogout = () => {
    clearAuthToken();
    setAuthenticated(false);
  };

  if (authenticated === null) return null; // Loading state

  if (!authenticated) {
    return <Login onLogin={() => setAuthenticated(true)} />;
  }

  return (
    <Router>
      <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0A' }}>
        <Sidebar onLogout={handleLogout} />
        <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/reports" element={<ReportedPosts />} />
            <Route path="/reported-chats" element={<ReportedChats />} />
            <Route path="/users" element={<UserManagement />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/broadcast" element={<Broadcast />} />
            <Route path="/criminals" element={<Criminals />} />
            <Route path="/developer" element={<Developer />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
