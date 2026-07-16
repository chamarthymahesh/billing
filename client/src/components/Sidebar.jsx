import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

export const menuItems = [
  { label: 'Dashboard', icon: '📊', path: '/dashboard', roles: ['companyadmin'] },
  { label: 'Dashboard', icon: '📊', path: '/super-admin/dashboard', roles: ['superadmin'] },
  { label: 'Companies', icon: '🏢', path: '/super-admin/companies', roles: ['superadmin', 'manager'] },
  { label: 'Invoices', icon: '🧾', path: '/invoices', roles: ['companyadmin', 'manager'] },
  { label: 'Create Invoice', icon: '✏️', path: '/invoices/create', roles: ['companyadmin', 'manager'] },
  { label: 'Purchases', icon: '🛒', path: '/purchases', roles: ['companyadmin', 'superadmin', 'manager'] },
  { label: 'Products', icon: '📦', path: '/products', roles: ['companyadmin', 'superadmin', 'manager'] },
  { label: 'Reports', icon: '📈', path: '/reports', roles: ['companyadmin', 'superadmin'] },
  { label: 'Transport', icon: '🚚', path: '/transport', roles: ['companyadmin'] },
  { label: 'Employees', icon: '👥', path: '/employees', roles: ['companyadmin'] },
  { label: 'Settings', icon: '⚙️', path: '/settings', roles: ['companyadmin', 'superadmin', 'manager'] },
  { label: 'All Invoices', icon: '🧾', path: '/super-admin/invoices', roles: ['superadmin', 'manager'] },
  { label: 'Global Stock', icon: '🏢', path: '/super-admin/global-stock', roles: ['superadmin', 'manager'] },
  { label: 'Stock Adjustment', icon: '⚖️', path: '/stock-adjustment', roles: ['superadmin', 'manager', 'companyadmin'] },
];

import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
    // Determine menu items to display based on logged-in user
  const filteredMenu = menuItems.filter(item => {
  // Items with no role restriction are always shown
  if (item.roles.length === 0) return true;
  // If a user is logged in, check their role
  return user && item.roles.includes(user.role);
});
console.log('Filtered menu:', filteredMenu);

  return (
    <motion.div 
      className={`sidebar ${collapsed ? 'collapsed' : ''}`}
      animate={{ width: collapsed ? 80 : 280 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <motion.span layout>⚡</motion.span>
          <AnimatePresence>
            {!collapsed && (
              <motion.span 
                className="logo-text"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
              >
                BillPro
              </motion.span>
            )}
          </AnimatePresence>
        </div>
        <button id="sidebar-toggle" className="collapse-btn" onClick={() => setCollapsed(!collapsed)}>
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <AnimatePresence>
        {!collapsed && (
          <motion.div 
            className="sidebar-user"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="user-avatar">{user?.name?.charAt(0)?.toUpperCase()}</div>
            <div>
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.role === 'superadmin' ? '👑 Super Admin' : user?.role === 'manager' ? '🛡️ Manager' : '🏢 Admin'}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="sidebar-nav">
        {filteredMenu.map((item, idx) => (
          <Link
            key={item.path}
            to={item.path}
            id={`nav-${item.label.replace(/\s+/g, '-').toLowerCase()}`}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <AnimatePresence>
              {!collapsed && (
                <motion.span 
                  className="nav-label"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={{ delay: idx * 0.05 }}
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        ))}
      </nav>

        <button id="logout-btn" className="logout-btn" onClick={() => { console.log('Logout button clicked'); logout(); navigate('/login', { replace: true }); }}>
          <span>🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>

    </motion.div>
  );
}
