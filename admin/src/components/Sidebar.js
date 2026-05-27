import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, AlertCircle, Users, LogOut, Megaphone, Terminal, Gavel, MessageSquare } from 'lucide-react';
import { isSuperAdmin, isStaff } from '../utils/auth';

const Sidebar = ({ onLogout }) => {
  return (
    <aside style={{
      width: '280px',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      padding: '40px 24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '40px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h1 style={{ fontSize: '32px', letterSpacing: '-2px' }}>
          l<span style={{ color: '#FF453A' }}>oo</span>na
        </h1>
        <div style={{
          background: 'rgba(255, 69, 58, 0.15)',
          padding: '2px 8px',
          borderRadius: '6px',
          fontSize: '10px',
          fontWeight: 'bold',
          color: '#FF453A'
        }}>ADMIN</div>
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {isStaff() && <SidebarItem to="/" icon={<LayoutDashboard size={20} />} label="Dashboard" />}
        <SidebarItem to="/reports" icon={<AlertCircle size={20} />} label="Reports" />
        <SidebarItem to="/reported-chats" icon={<MessageSquare size={20} />} label="Reported Chats" />
        {isSuperAdmin() && <SidebarItem to="/users" icon={<Users size={20} />} label="Users" />}
        {isSuperAdmin() && <SidebarItem to="/criminals" icon={<Gavel size={20} />} label="Criminals" />}
        {isSuperAdmin() && <SidebarItem to="/broadcast" icon={<Megaphone size={20} />} label="Broadcast" />}
        {isSuperAdmin() && <SidebarItem to="/developer" icon={<Terminal size={20} />} label="Developer" />}
      </nav>

      <div style={{ marginTop: 'auto' }}>
        <button 
          onClick={onLogout}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            borderRadius: '12px',
            color: '#71717A',
            background: 'transparent',
            border: 'none',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          <LogOut size={20} /> Logout
        </button>
      </div>
    </aside>
  );
};

const SidebarItem = ({ to, icon, label }) => {
  return (
    <NavLink 
      to={to} 
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '12px 16px',
        borderRadius: '12px',
        textDecoration: 'none',
        color: isActive ? '#FFFFFF' : '#71717A',
        background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent',
        fontSize: '14px',
        fontWeight: '600',
        transition: 'all 0.2s ease'
      })}
    >
      {icon}
      {label}
    </NavLink>
  );
};

export default Sidebar;
