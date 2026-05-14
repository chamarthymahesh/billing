import React, { useState, useEffect } from 'react';
import API from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import './Settings.css';

export default function Settings() {
  const { user } = useAuth();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (user?.companyId) {
      API.get(`/companies/${user.companyId}`)
        .then(r => setCompany(r.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: '', type: '' });
    try {
      const { _id, createdAt, updatedAt, __v, ...updateData } = company;
      await API.put(`/companies/${_id}`, updateData);
      setMessage({ text: 'Settings updated successfully!', type: 'success' });
    } catch (err) {
      setMessage({ text: 'Error updating settings.', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Layout><div className="loading-state">Loading settings...</div></Layout>;
  
  if (!company && user?.role !== 'superadmin') {
    return (
      <Layout>
        <div className="error-container glass-card">
          <h2>🚫 No Company Profile Found</h2>
          <p>Your account is not associated with any company. Please contact the Super Admin to link your profile.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Business Settings</h1>
          <p className="page-subtitle">Manage your company profile and billing preferences</p>
        </div>
      </div>

      <div className="settings-container">
        <form onSubmit={handleSave} className="settings-form">
          {/* General Profile */}
          <div className="glass-card settings-section">
            <h2 className="section-title">Company Profile</h2>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Company Name</label>
                <input className="input-field" value={company?.name || ''} 
                  onChange={e => setCompany({...company, name: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>GSTIN</label>
                <input className="input-field" value={company?.gstin || ''} 
                  onChange={e => setCompany({...company, gstin: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input className="input-field" value={company?.phone || ''} 
                  onChange={e => setCompany({...company, phone: e.target.value})} required />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input className="input-field" type="email" value={company?.email || ''} 
                  onChange={e => setCompany({...company, email: e.target.value})} required />
              </div>
              <div className="form-group full-width">
                <label>Address</label>
                <textarea className="input-field" value={company?.address || ''} rows="2"
                  onChange={e => setCompany({...company, address: e.target.value})} required />
              </div>
            </div>
          </div>

          {/* Bank Details */}
          <div className="glass-card settings-section">
            <h2 className="section-title">Bank Details (For Invoices)</h2>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Bank Name</label>
                <input className="input-field" value={company?.bankDetails?.bankName || ''} 
                  onChange={e => setCompany({...company, bankDetails: {...company.bankDetails, bankName: e.target.value}})} />
              </div>
              <div className="form-group">
                <label>Account Number</label>
                <input className="input-field" value={company?.bankDetails?.accountNo || ''} 
                  onChange={e => setCompany({...company, bankDetails: {...company.bankDetails, accountNo: e.target.value}})} />
              </div>
              <div className="form-group">
                <label>IFSC Code</label>
                <input className="input-field" value={company?.bankDetails?.ifscCode || ''} 
                  onChange={e => setCompany({...company, bankDetails: {...company.bankDetails, ifscCode: e.target.value}})} />
              </div>
              <div className="form-group">
                <label>Branch Name</label>
                <input className="input-field" value={company?.bankDetails?.branch || ''} 
                  onChange={e => setCompany({...company, bankDetails: {...company.bankDetails, branch: e.target.value}})} />
              </div>
            </div>
          </div>

          <div className="glass-card settings-section">
            <h2 className="section-title">Invoice & Header Templates</h2>
            <div className="form-grid-2">
              <div className="form-group">
                <label>Invoice Header Style</label>
                <select className="input-field" value={company?.settings?.invoiceTemplate || 'Professional'} 
                  onChange={e => setCompany({...company, settings: {...company.settings, invoiceTemplate: e.target.value}})}>
                  <option value="Professional">🏢 Professional (Logo Left)</option>
                  <option value="Modern">✨ Modern (Logo Right)</option>
                  <option value="Classic">📜 Classic (Centered)</option>
                </select>
              </div>
              <div className="form-group">
                <label>Current Financial Year</label>
                <select className="input-field" value={company?.settings?.financialYear || '2026-27'} 
                  onChange={e => setCompany({...company, settings: {...company.settings, financialYear: e.target.value}})}>
                  <option value="2025-26">2025-26</option>
                  <option value="2026-27">2026-27</option>
                  <option value="2027-28">2027-28</option>
                </select>
              </div>
              <div className="form-group">
                <label>FY Prefix (Short)</label>
                <input className="input-field" placeholder="e.g. 26-27" value={company?.settings?.fyPrefix || ''} 
                  onChange={e => setCompany({...company, settings: {...company.settings, fyPrefix: e.target.value}})} />
              </div>
              <div className="form-group">
                <label>Invoice Prefix</label>
                <input className="input-field" value={company?.settings?.invoicePrefix || ''} 
                  onChange={e => setCompany({...company, settings: {...company.settings, invoicePrefix: e.target.value}})} />
              </div>
              <div className="form-group full-width">
                <label>Standard Terms & Conditions</label>
                <textarea 
                  className="input-field" 
                  rows="4"
                  placeholder="1. Goods once sold...\n2. Payment due within..."
                  value={company?.settings?.termsAndConditions || ''} 
                  onChange={e => setCompany({...company, settings: {...company.settings, termsAndConditions: e.target.value}})} 
                />
              </div>
            </div>
            <div className="settings-info-box">
              ℹ️ Your next invoice number will look like: <b>{company?.settings?.invoicePrefix}/{company?.settings?.fyPrefix}/{String(company?.settings?.nextInvoiceNumber || 1).padStart(3, '0')}</b>
            </div>
          </div>

          {message.text && (
            <div className={`form-message ${message.type}`}>
              {message.text}
            </div>
          )}

          <div className="settings-footer">
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Saving...' : '💾 Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
