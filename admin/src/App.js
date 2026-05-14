import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ReportedPosts from './pages/ReportedPosts';
import UserManagement from './pages/UserManagement';
import Broadcast from './pages/Broadcast';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import { isAdmin as checkIsAdmin, clearAuthToken } from './utils/auth';

function App() {
  const [authenticated, setAuthenticated] = useState(null);

  useEffect(() => {
    setAuthenticated(!!checkIsAdmin());
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
            <Route path="/users" element={<UserManagement />} />
            <Route path="/broadcast" element={<Broadcast />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
