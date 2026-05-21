import React, { useState } from 'react';

import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const menuItems = [
  { label: 'Dashboard', icon: '📊', path: '/dashboard', roles: ['companyadmin'] },
  { label: 'Dashboard', icon: '📊', path: '/super-admin/dashboard', roles: ['superadmin'] },
  { label: 'Companies', icon: '🏢', path: '/super-admin/companies', roles: ['superadmin'] },
  { label: 'Invoices', icon: '🧾', path: '/invoices', roles: ['companyadmin'] },
  { label: 'Create Invoice', icon: '✏️', path: '/invoices/create', roles: ['companyadmin'] },
  { label: 'Purchases', icon: '🛒', path: '/purchases', roles: ['companyadmin', 'superadmin'] },
  { label: 'Products', icon: '📦', path: '/products', roles: ['companyadmin', 'superadmin'] },
  { label: 'Reports', icon: '📈', path: '/reports', roles: ['companyadmin'] },
  { label: 'Transport', icon: '🚚', path: '/transport', roles: ['companyadmin'] },
  { label: 'Employees', icon: '👥', path: '/employees', roles: ['companyadmin'] },
  { label: 'Settings', icon: '⚙️', path: '/settings', roles: ['companyadmin', 'superadmin'] },
  { label: 'All Invoices', icon: '🧾', path: '/super-admin/invoices', roles: ['superadmin'] },
  { label: 'Global Stock', icon: '🏢', path: '/super-admin/global-stock', roles: ['superadmin'] },
  { label: 'Reports', icon: '📈', path: '/super-admin/reports', roles: ['superadmin'] },
];

import { motion, AnimatePresence } from 'framer-motion';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const filteredMenu = menuItems.filter(item => item.roles.includes(user?.role));

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
              <div className="user-role">{user?.role === 'superadmin' ? '👑 Super Admin' : '🏢 Admin'}</div>
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

      <button id="logout-btn" className="logout-btn" onClick={() => { logout(); navigate('/login'); }}>
        <span>🚪</span>
        {!collapsed && <span>Logout</span>}
      </button>
    </motion.div>
  );
}
