import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Invoices from './pages/Invoices';
import CreateInvoice from './pages/CreateInvoice';
import Products from './pages/Products';
import Reports from './pages/Reports';
import SuperAdmin from './pages/SuperAdmin';
import InvoiceDetail from './pages/InvoiceDetail';
import AdminInvoices from './pages/AdminInvoices';
import Settings from './pages/Settings';
import Purchases from './pages/Purchases';
import GlobalStock from './pages/GlobalStock';
import Transport from './pages/Transport';
import Employees from './pages/Employees';

const ProtectedRoute = ({ children, adminOnly = false }) => {

  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'superadmin') return <Navigate to="/" />;
  return children;
};

import AdminReports from './pages/AdminReports';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Navigate to="/dashboard" /></ProtectedRoute>} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
          <Route path="/invoices/create" element={<ProtectedRoute><CreateInvoice /></ProtectedRoute>} />
          <Route path="/invoices/:id" element={<ProtectedRoute><InvoiceDetail /></ProtectedRoute>} />
          <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
          <Route path="/purchases" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          <Route path="/transport" element={<ProtectedRoute><Transport /></ProtectedRoute>} />
          <Route path="/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/super-admin" element={<ProtectedRoute adminOnly><SuperAdmin /></ProtectedRoute>} />
          <Route path="/super-admin/invoices" element={<ProtectedRoute adminOnly><AdminInvoices /></ProtectedRoute>} />
          <Route path="/super-admin/global-stock" element={<ProtectedRoute adminOnly><GlobalStock /></ProtectedRoute>} />
          <Route path="/super-admin/reports" element={<ProtectedRoute adminOnly><AdminReports /></ProtectedRoute>} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
