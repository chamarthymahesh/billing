import React from 'react';
import { useAuth } from '../context/AuthContext';
import { menuItems } from './Sidebar';

const DebugInfo = () => {
  const { user } = useAuth();
  const filteredMenu = user ? menuItems.filter(item => item.roles.length === 0 || item.roles.includes(user.role)) : [];
  return (
    <div style={{ padding: '1rem', background: '#1e1e1e', color: '#fff', fontFamily: 'monospace', fontSize: '0.9rem' }}>
      <div><strong>User:</strong> {user ? JSON.stringify(user) : 'null'}</div>
      <div><strong>Filtered Menu:</strong> {JSON.stringify(filteredMenu.map(i => i.label))}</div>
    </div>
  );
};

export default DebugInfo;
