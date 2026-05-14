import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import './SuperAdmin.css';

export default function SuperAdmin() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', gstin: '', address: '', phone: '', email: '' });
  const [editingId, setEditingId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.gstin && c.gstin.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/companies');
      setCompanies(data);
    } catch (err) {
      console.error('Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

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
      alert('Error saving company details');
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

  const summaryStats = [
    { label: 'Total Companies', value: companies.length, icon: '🏢', color: '#6366f1', onClick: () => {} },
    { label: 'All Invoices', value: 'View All', icon: '🧾', color: '#ec4899', onClick: () => navigate('/super-admin/invoices') },
    { label: 'Global Reports', value: 'Analytics', icon: '📊', color: '#f59e0b', onClick: () => navigate('/super-admin/reports') },
  ];

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Super Admin Dashboard</h1>
          <p className="page-subtitle">Global oversight and company management</p>
        </div>
        <div className="header-actions">
          <button id="add-company-btn" className="btn-primary" onClick={openAdd}>+ Add Company</button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        {summaryStats.map(card => (
          <div 
            key={card.label} 
            className={`glass-card stat-card-item ${card.onClick ? 'clickable' : ''}`} 
            style={{ '--accent-color': card.color }}
            onClick={card.onClick}
          >
            <div className="stat-icon-wrap">{card.icon}</div>
            <div>
              <div className="stat-val">{card.value}</div>
              <div className="stat-lbl">{card.label}</div>
            </div>
          </div>
        ))}
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
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.length === 0 ? (
                  <tr><td colSpan="5" className="empty-row">No companies found matching "{searchTerm}"</td></tr>
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
                      <td>
                        <div className="action-btns">
                          <button className="action-btn-icon view" onClick={() => viewCompanyInvoices(c._id)} title="View Invoices">👁️</button>
                          <button className="action-btn-icon edit" onClick={() => openEdit(c)} title="Edit">✏️</button>
                          <button className="action-btn-icon del" onClick={() => handleDelete(c._id)} title="Delete">🗑️</button>
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
