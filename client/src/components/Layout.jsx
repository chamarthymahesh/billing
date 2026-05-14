import React from 'react';
import Sidebar from './Sidebar';

import './Layout.css';

import { motion } from 'framer-motion';

export default function Layout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <motion.main 
        className="main-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {children}
      </motion.main>
    </div>
  );
}
