import React, { useState, useEffect } from 'react';
import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import './Reports.css';

export default function AdminReports() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    fetchGlobalReports();
  }, []);

  const fetchGlobalReports = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/invoices/global-reports');
      setReports(data);
    } catch (err) {
      console.error('Error fetching global reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const totalGlobalSales = reports.reduce((s, r) => s + r.totalSales, 0);
  const totalGlobalGst = reports.reduce((s, r) => s + r.totalGst, 0);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Global Analytics</h1>
          <p className="page-subtitle">Company-wise performance overview</p>
        </div>
        <div className="header-actions">
           <button className="btn-secondary" onClick={fetchGlobalReports}>🔄 Refresh Data</button>
        </div>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="glass-card stat-card-item" style={{ '--accent-color': '#6366f1' }}>
          <div className="stat-icon-wrap">💰</div>
          <div>
            <div className="stat-val">₹{totalGlobalSales.toLocaleString('en-IN')}</div>
            <div className="stat-lbl">Global Revenue (All Companies)</div>
          </div>
        </div>
        <div className="glass-card stat-card-item" style={{ '--accent-color': '#10b981' }}>
          <div className="stat-icon-wrap">🏛️</div>
          <div>
            <div className="stat-val">₹{totalGlobalGst.toLocaleString('en-IN')}</div>
            <div className="stat-lbl">Total GST Collection</div>
          </div>
        </div>
        <div className="glass-card stat-card-item" style={{ '--accent-color': '#f59e0b' }}>
          <div className="stat-icon-wrap">🏢</div>
          <div>
            <div className="stat-val">{reports.length}</div>
            <div className="stat-lbl">Active Companies</div>
          </div>
        </div>
      </div>

      <div className="glass-card">
        <h2 className="section-title">Company-wise Performance Report</h2>
        {loading ? <div className="loading-state">Generating reports...</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  <th>GSTIN</th>
                  <th>Invoices</th>
                  <th>Total Revenue</th>
                  <th>Total GST</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {reports.length === 0 ? <tr><td colSpan="6" className="empty-row">No data available</td></tr> :
                  reports.map(row => (
                    <tr key={row._id}>
                      <td className="company-name-cell">🏢 {row.name}</td>
                      <td><span className="gstin-val">{row.gstin || 'Non-GST'}</span></td>
                      <td className="count-cell">{row.invoiceCount}</td>
                      <td className="val-cell">₹{row.totalSales.toLocaleString('en-IN')}</td>
                      <td className="val-cell gst">₹{row.totalGst.toLocaleString('en-IN')}</td>
                      <td><span className={`status-badge ${row.status.toLowerCase()}`}>{row.status}</span></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
