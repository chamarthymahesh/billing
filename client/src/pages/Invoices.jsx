import React, { useState, useEffect } from 'react';

import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import './Invoices.css';

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  
  // Bulk selection state
  const [selectedInvoices, setSelectedInvoices] = useState([]);
  const [isUpdatingBulk, setIsUpdatingBulk] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, []);
  
  const fetchInvoices = () => {
    setLoading(true);
    API.get('/invoices').then(r => {
      setInvoices(r.data);
      setFiltered(r.data);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    let list = invoices;
    if (statusFilter !== 'all') list = list.filter(i => i.status === statusFilter);
    if (search) list = list.filter(i =>
      i.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      i.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
      i.gemContractNumber?.toLowerCase().includes(search.toLowerCase())
    );
    setFiltered(list);
  }, [search, statusFilter, invoices]);

  const updateStatus = async (id, status) => {
    try {
      await API.put(`/invoices/${id}/status`, { status });
      setInvoices(prev => prev.map(i => i._id === id ? { ...i, status } : i));
    } catch (err) {
      alert('Error updating status');
    }
  };

  const updateDeliveryStatus = async (id, status) => {
    try {
      await API.put(`/invoices/${id}/delivery-status`, { materialDeliveryStatus: status });
      setInvoices(prev => prev.map(i => i._id === id ? { ...i, materialDeliveryStatus: status } : i));
    } catch (err) {
      alert('Error updating delivery status');
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this invoice? This action cannot be undone.')) return;
    try {
      await API.delete(`/invoices/${id}`);
      setInvoices(prev => prev.filter(i => i._id !== id));
      alert('Invoice deleted successfully');
    } catch (err) {
      alert(err.response?.data?.message || 'Error deleting invoice');
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedInvoices(filtered.map(i => i._id));
    } else {
      setSelectedInvoices([]);
    }
  };

  const handleSelectInvoice = (id) => {
    if (selectedInvoices.includes(id)) {
      setSelectedInvoices(prev => prev.filter(selectedId => selectedId !== id));
    } else {
      setSelectedInvoices(prev => [...prev, id]);
    }
  };

  const handleBulkUpdateStatus = async (status) => {
    if (!status || selectedInvoices.length === 0) return;
    if (!window.confirm(`Are you sure you want to update payment status to "${status.toUpperCase()}" for ${selectedInvoices.length} invoices?`)) return;
    
    setIsUpdatingBulk(true);
    try {
      await Promise.all(selectedInvoices.map(id => API.put(`/invoices/${id}/status`, { status })));
      // Update local state directly to avoid refetching everything immediately if possible, or just refetch.
      setInvoices(prev => prev.map(i => selectedInvoices.includes(i._id) ? { ...i, status } : i));
      setSelectedInvoices([]);
    } catch (err) {
      alert('Error updating some invoices. Please refresh to see current states.');
      fetchInvoices();
    } finally {
      setIsUpdatingBulk(false);
    }
  };

  const handleBulkUpdateDelivery = async (status) => {
    if (!status || selectedInvoices.length === 0) return;
    if (!window.confirm(`Are you sure you want to update delivery status to "${status}" for ${selectedInvoices.length} invoices?`)) return;
    
    setIsUpdatingBulk(true);
    try {
      await Promise.all(selectedInvoices.map(id => API.put(`/invoices/${id}/delivery-status`, { materialDeliveryStatus: status })));
      setInvoices(prev => prev.map(i => selectedInvoices.includes(i._id) ? { ...i, materialDeliveryStatus: status } : i));
      setSelectedInvoices([]);
    } catch (err) {
      alert('Error updating some invoices. Please refresh to see current states.');
      fetchInvoices();
    } finally {
      setIsUpdatingBulk(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Manage all your billing invoices</p>
        </div>
        <Link to="/invoices/create" id="create-invoice-btn" className="btn-primary">+ Create Invoice</Link>
      </div>

      <div className="glass-card">
        <div className="table-filters" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch' }}>
          <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
            <input
              id="invoice-search"
              className="input-field search-input"
              style={{ flex: 1, minWidth: '200px' }}
              placeholder="Search by invoice #, customer, or GeM contract..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <select
              id="status-filter"
              className="input-field filter-select"
              style={{ width: '200px' }}
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="partially_paid">Partially Paid</option>
            </select>
          </div>
          
          {selectedInvoices.length > 0 && (user?.role === 'companyadmin' || user?.role === 'manager') && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 'bold', color: '#93c5fd' }}>{selectedInvoices.length} invoices selected</span>
              
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Payment:</span>
                <button disabled={isUpdatingBulk} className="btn-primary btn-sm" style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#10b981', borderColor: '#10b981' }} onClick={() => handleBulkUpdateStatus('paid')}>Mark Paid</button>
                <button disabled={isUpdatingBulk} className="btn-primary btn-sm" style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleBulkUpdateStatus('unpaid')}>Mark Unpaid</button>
              </div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '16px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Delivery:</span>
                <button disabled={isUpdatingBulk} className="btn-primary btn-sm" style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#10b981', borderColor: '#10b981' }} onClick={() => handleBulkUpdateDelivery('Delivered')}>Set Delivered</button>
                <button disabled={isUpdatingBulk} className="btn-primary btn-sm" style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: '#f59e0b', borderColor: '#f59e0b' }} onClick={() => handleBulkUpdateDelivery('Pending')}>Set Pending</button>
              </div>
            </div>
          )}
        </div>

        {loading ? <div className="loading-state">Loading invoices...</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  {(user?.role === 'companyadmin' || user?.role === 'manager') && (
                    <th style={{ width: '40px', textAlign: 'center' }}>
                      <input 
                        type="checkbox" 
                        checked={filtered.length > 0 && selectedInvoices.length === filtered.length}
                        onChange={handleSelectAll}
                        style={{ cursor: 'pointer' }}
                      />
                    </th>
                  )}
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>GeM Contract</th>
                  <th>Type</th>
                  <th>Subtotal</th>
                  <th>GST</th>
                  <th>Transport</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Delivery Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={user?.role === 'companyadmin' ? 13 : 12} className="empty-row">No invoices found</td></tr>
                ) : filtered.map(inv => {
                  if (!inv) return null;
                  return (
                    <tr key={inv._id} style={{ background: selectedInvoices.includes(inv._id) ? 'rgba(59, 130, 246, 0.05)' : '' }}>
                      {(user?.role === 'companyadmin' || user?.role === 'manager') && (
                        <td style={{ textAlign: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={selectedInvoices.includes(inv._id)}
                            onChange={() => handleSelectInvoice(inv._id)}
                            style={{ cursor: 'pointer' }}
                          />
                        </td>
                      )}
                      <td className="inv-num-cell">{inv.invoiceNumber}</td>
                      <td>{inv.date ? new Date(inv.date).toLocaleDateString('en-IN') : 'N/A'}</td>
                      <td>{inv.customer?.name || 'N/A'}</td>
                      <td>{inv.gemContractNumber || '-'}</td>
                      <td><span className={`type-badge ${inv.isGst ? 'gst' : 'nongst'}`}>{inv.isGst ? 'GST' : 'Non-GST'}</span></td>
                      <td>₹{(inv.subTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>₹{(inv.totalGst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>₹{(inv.transportCharges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="grand-total">₹{(inv.grandTotal || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>
                        {(user?.role === 'companyadmin' || user?.role === 'manager') ? (
                          <select
                            className="status-select"
                            value={inv.status || 'unpaid'}
                            onChange={e => updateStatus(inv._id, e.target.value)}
                          >
                            <option value="paid">Paid</option>
                            <option value="unpaid">Unpaid</option>
                            <option value="partially_paid">Partial</option>
                          </select>
                        ) : (
                          <span className={`status-tag status-${inv.status || 'unpaid'}`}>
                            {(inv.status || 'unpaid').toUpperCase()}
                          </span>
                        )}
                      </td>
                      <td>
                        {(user?.role === 'companyadmin' || user?.role === 'manager') ? (
                          <select
                            className="status-select"
                            style={{ 
                              background: inv.materialDeliveryStatus === 'Delivered' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                              color: inv.materialDeliveryStatus === 'Delivered' ? '#10b981' : '#f59e0b',
                              border: inv.materialDeliveryStatus === 'Delivered' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
                              padding: '4px',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
                            value={inv.materialDeliveryStatus || 'Pending'}
                            onChange={e => updateDeliveryStatus(inv._id, e.target.value)}
                          >
                            <option value="Pending">⏳ Pending</option>
                            <option value="Delivered">✅ Delivered</option>
                          </select>
                        ) : (
                          <span 
                            className={`badge`}
                            style={{ 
                              background: inv.materialDeliveryStatus === 'Delivered' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
                              color: inv.materialDeliveryStatus === 'Delivered' ? '#10b981' : '#f59e0b',
                              border: inv.materialDeliveryStatus === 'Delivered' ? '1px solid rgba(16, 185, 129, 0.2)' : '1px solid rgba(245, 158, 11, 0.2)',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontWeight: 'bold',
                              fontSize: '11px',
                              display: 'inline-block'
                            }}
                          >
                            {inv.materialDeliveryStatus || 'Pending'}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="action-btns" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <Link to={`/invoices/${inv._id}`} className="action-btn view" style={{ padding: '4px 8px', borderRadius: '4px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }} title="View Invoice">👁️</Link>
                          {(user?.role === 'companyadmin' || user?.role === 'manager') && (
                            <>
                              <Link to={`/invoices/edit/${inv._id}`} className="action-btn edit" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.2)', textDecoration: 'none', padding: '4px 8px', borderRadius: '4px', display: 'inline-flex', alignItems: 'center', fontSize: '12px' }} title="Edit Invoice">✏️</Link>
                              {user?.role !== 'manager' && (
                                <button onClick={() => handleDeleteInvoice(inv._id)} className="action-btn delete" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', fontSize: '12px' }} title="Delete Invoice">🗑️</button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
