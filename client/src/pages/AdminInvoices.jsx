import React, { useState, useEffect } from 'react';
import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import { Link, useSearchParams } from 'react-router-dom';

export default function AdminInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [filteredInvoices, setFilteredInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const companyIdFilter = searchParams.get('companyId');

  useEffect(() => {
    API.get('/invoices')
      .then(r => {
        setInvoices(r.data);
        if (companyIdFilter) {
          setFilteredInvoices(r.data.filter(inv => {
            const idVal = inv.companyId?._id || inv.companyId;
            return idVal === companyIdFilter;
          }));
        } else {
          setFilteredInvoices(r.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [companyIdFilter]);

  const clearFilter = () => {
    setSearchParams({});
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">All System Invoices</h1>
          <p className="page-subtitle">
            {companyIdFilter && filteredInvoices.length > 0
              ? `Monitoring activity for company: ${filteredInvoices[0]?.companyId?.name}` 
              : 'Monitoring activity across all companies'}
          </p>
        </div>
        {companyIdFilter && (
          <button className="btn-secondary" onClick={clearFilter} style={{ padding: '6px 12px', fontSize: '13px' }}>Show All Invoices</button>
        )}
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
                {filteredInvoices.length === 0 ? (
                  <tr><td colSpan="7" className="empty-row">No invoices found</td></tr>
                ) : filteredInvoices.map(inv => (
                  <tr key={inv._id}>
                    <td>{inv.invoiceNumber}</td>
                    <td><span className="badge badge-gst">{inv.companyId?.name || 'N/A'}</span></td>
                    <td>{new Date(inv.date).toLocaleDateString('en-IN')}</td>
                    <td>{inv.customer?.name}</td>
                    <td className="price-cell">₹{inv.grandTotal.toLocaleString('en-IN')}</td>
                    <td><span className={`badge badge-${inv.status || 'unpaid'}`}>{inv.status || 'unpaid'}</span></td>
                    <td>
                      <Link to={`/invoices/${inv._id}`} className="action-btn-icon view" title="View Detail">👁</Link>
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
