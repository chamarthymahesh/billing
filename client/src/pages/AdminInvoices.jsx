import React, { useState, useEffect } from 'react';
import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import { Link } from 'react-router-dom';

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/invoices')
      .then(r => setInvoices(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">All System Invoices</h1>
          <p className="page-subtitle">Monitoring activity across all companies</p>
        </div>
      </div>

      <div className="glass-card">
        {loading ? <div className="loading-state">Loading all invoices...</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice #</th>
                  <th>Company</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan="7" className="empty-row">No invoices in system</td></tr>
                ) : invoices.map(inv => (
                  <tr key={inv._id}>
                    <td>{inv.invoiceNumber}</td>
                    <td><span className="badge badge-gst">{inv.companyId?.name}</span></td>
                    <td>{new Date(inv.date).toLocaleDateString('en-IN')}</td>
                    <td>{inv.customer?.name}</td>
                    <td className="price-cell">₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                    <td><span className={`badge badge-${inv.status}`}>{inv.status}</span></td>
                    <td>
                      <Link to={`/invoices/${inv._id}`} className="action-btn-icon view">👁</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
