import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import './SuperAdmin.css';

export default function SuperAdmin() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', gstin: '', address: '', phone: '', email: '' });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [globalStats, setGlobalStats] = useState(null);
  const [companyProfits, setCompanyProfits] = useState({});
  const [resetModal, setResetModal] = useState(null); // { companyId, companyName }
  const [newPassword, setNewPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.gstin && c.gstin.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data: companyData } = await API.get('/companies');
      setCompanies(companyData);
      // Fetch detailed reports for profits per company
      const { data: reports } = await API.get('/invoices/detailed-reports');
      // Map company ID to profit
      const profitMap = {};
      reports.forEach(rep => {
        profitMap[rep._id] = rep.totals.profit || 0;
      });
      setCompanyProfits(profitMap);
    } catch (err) {
      console.error('Error fetching companies or reports:', err);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCompanies();
  }, []);

  const openAdd = () => { 
    setForm({ name: '', gstin: '', address: '', phone: '', email: '' }); 
    setEditingId(null); 
    setShowForm(true); 
  };
  
  const openEdit = (c) => { 
    setForm(c); 
    setEditingId(c._id); 
    setShowForm(true); 
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await API.put(`/companies/${editingId}`, form);
      } else {
        await API.post('/companies', form);
      }
      setShowForm(false);
      fetchCompanies();
    } catch (err) {
      const msg = err.response?.data?.message || 'Error saving company details';
      alert(msg);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this company? All associated data will be lost.')) return;
    try {
      await API.delete(`/companies/${id}`);
      fetchCompanies();
    } catch (err) {
      alert('Error deleting company');
    }
  };

  const viewCompanyInvoices = (id) => {
    // Navigate to a filtered invoices view (to be implemented/enhanced)
    navigate(`/super-admin/invoices?companyId=${id}`);
  };

  const openResetModal = (c) => {
    setResetModal({ companyId: c._id, companyName: c.name });
    setNewPassword('');
    setResetMsg('');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      setResetMsg('Password must be at least 4 characters.');
      return;
    }
    setResetLoading(true);
    setResetMsg('');
    try {
      await API.put(`/companies/${resetModal.companyId}/reset-password`, { newPassword });
      setResetMsg('✅ Password reset successfully!');
      setTimeout(() => setResetModal(null), 1500);
    } catch (err) {
      setResetMsg('❌ ' + (err.response?.data?.message || 'Error resetting password'));
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Company Management</h1>
          <p className="page-subtitle">Register and manage client companies</p>
        </div>
        <div className="header-actions">
          <button id="add-company-btn" className="btn-primary" onClick={openAdd}>+ Add Company</button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="modal-overlay">
            <motion.div 
              className="modal glass-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="modal-header">
                <h2>{editingId ? 'Edit Company' : 'Add Company'}</h2>
                <button className="close-btn" onClick={() => setShowForm(false)}>✕</button>
              </div>
              <form onSubmit={handleSave} className="modal-form">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Name *</label>
                    <input className="input-field" required value={form.name} onChange={e => setForm(f=>({ ...f, name:e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>GSTIN</label>
                    <input className="input-field" placeholder="Optional" value={form.gstin} onChange={e => setForm(f=>({ ...f, gstin:e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Phone *</label>
                    <input className="input-field" required value={form.phone || ''} onChange={e => setForm(f=>({ ...f, phone:e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Company Email *</label>
                    <input type="email" className="input-field" required value={form.email || ''} onChange={e => setForm(f=>({ ...f, email:e.target.value }))} />
                  </div>
                  <div className="form-group full-width">
                    <label>Address *</label>
                    <input className="input-field" required value={form.address} onChange={e => setForm(f=>({ ...f, address:e.target.value }))} />
                  </div>
                  {!editingId && (
                    <>
                      <div className="form-divider full-width">Admin Account Details</div>
                      <div className="form-group">
                        <label>Admin User Email *</label>
                        <input type="email" className="input-field highlight-input" required 
                          placeholder="login-id@company.com"
                          value={form.adminEmail || ''} onChange={e => setForm(f=>({ ...f, adminEmail:e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Admin Password *</label>
                        <input type="text" className="input-field highlight-input" required 
                          placeholder="Create password"
                          value={form.adminPassword || ''} onChange={e => setForm(f=>({ ...f, adminPassword:e.target.value }))} />
                      </div>
                    </>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">{editingId ? 'Update' : 'Create'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reset Password Modal */}
      <AnimatePresence>
        {resetModal && (
          <div className="modal-overlay">
            <motion.div
              className="modal glass-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="modal-header">
                <h2>🔑 Reset Password</h2>
                <button className="close-btn" onClick={() => setResetModal(null)}>✕</button>
              </div>
              <p style={{ marginBottom: '1rem', opacity: 0.75 }}>
                Set a new password for <strong>{resetModal.companyName}</strong>'s admin account.
              </p>
              <form onSubmit={handleResetPassword} className="modal-form">
                <div className="form-group">
                  <label>New Password *</label>
                  <input
                    type="text"
                    className="input-field highlight-input"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                {resetMsg && (
                  <p style={{ color: resetMsg.startsWith('✅') ? '#4ade80' : '#f87171', marginTop: '0.5rem' }}>
                    {resetMsg}
                  </p>
                )}
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setResetModal(null)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={resetLoading}>
                    {resetLoading ? 'Resetting...' : 'Reset Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="glass-card">
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="section-title">Registered Companies</h2>
          <div className="search-wrap">
            <input 
              type="text" 
              className="input-field search-input" 
              placeholder="Search by name, email or GST..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        {loading ? <div className="loading-state">Loading companies...</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>GSTIN Status</th>
                  <th>Contact</th>
                  <th>Email Address</th>
                  <th>Profit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.length === 0 ? (
                  <tr><td colSpan="6" className="empty-row">No companies found matching "{searchTerm}"</td></tr>
                ) : (
                  filteredCompanies.map(c => (
                    <tr key={c._id}>
                      <td>
                        <div className="company-info-cell">
                          <div className="company-avatar">{c.name.charAt(0)}</div>
                          <div className="company-name">{c.name}</div>
                        </div>
                      </td>
                      <td><span className={`badge ${c.gstin ? 'badge-gst' : 'badge-nongst'}`}>{c.gstin || 'Non-GST'}</span></td>
                      <td>{c.phone}</td>
                      <td>{c.email}</td>
                      <td>{companyProfits[c._id]?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                      <td>
                        <div className="action-btns">
                          <button className="action-btn-icon view" onClick={() => viewCompanyInvoices(c._id)} title="View Invoices">👁️</button>
                          <button className="action-btn-icon edit" onClick={() => openEdit(c)} title="Edit">✏️</button>
                          <button className="action-btn-icon" style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa' }} onClick={() => openResetModal(c)} title="Reset Password">🔑</button>
                          {user?.role !== 'manager' && (
                            <button className="action-btn-icon del" onClick={() => handleDelete(c._id)} title="Delete">🗑️</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>


    </Layout>
  );
}
