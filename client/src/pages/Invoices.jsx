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

  useEffect(() => {
    API.get('/invoices').then(r => {
      setInvoices(r.data);
      setFiltered(r.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    let list = invoices;
    if (statusFilter !== 'all') list = list.filter(i => i.status === statusFilter);
    if (search) list = list.filter(i =>
      i.invoiceNumber?.toLowerCase().includes(search.toLowerCase()) ||
      i.customer?.name?.toLowerCase().includes(search.toLowerCase())
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
        <div className="table-filters">
          <input
            id="invoice-search"
            className="input-field search-input"
            placeholder="Search by invoice # or customer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            id="status-filter"
            className="input-field filter-select"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
            <option value="partially_paid">Partially Paid</option>
          </select>
        </div>

        {loading ? <div className="loading-state">Loading invoices...</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Subtotal</th>
                  <th>GST</th>
                  <th>Transport</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="10" className="empty-row">No invoices found</td></tr>
                ) : filtered.map(inv => {
                  if (!inv) return null;
                  return (
                    <tr key={inv._id}>
                      <td className="inv-num-cell">{inv.invoiceNumber}</td>
                      <td>{inv.date ? new Date(inv.date).toLocaleDateString('en-IN') : 'N/A'}</td>
                      <td>{inv.customer?.name || 'N/A'}</td>
                      <td><span className={`type-badge ${inv.isGst ? 'gst' : 'nongst'}`}>{inv.isGst ? 'GST' : 'Non-GST'}</span></td>
                      <td>₹{(inv.subTotal || 0).toLocaleString('en-IN')}</td>
                      <td>₹{(inv.totalGst || 0).toLocaleString('en-IN')}</td>
                      <td>₹{(inv.transportCharges || 0).toLocaleString('en-IN')}</td>
                      <td className="grand-total">₹{(inv.grandTotal || 0).toLocaleString('en-IN')}</td>
                      <td>
                        {user?.role === 'companyadmin' ? (
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
                        <div className="action-btns">
                          <Link to={`/invoices/${inv._id}`} className="action-btn view">👁</Link>
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
