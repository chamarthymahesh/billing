import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import './Reports.css';

export default function AdminReports() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const metric = searchParams.get('metric'); // sales, purchases, profit, transport, commission
  
  const [reports, setReports] = useState([]);
  const [detailedReports, setDetailedReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCompanyId, setExpandedCompanyId] = useState(null);

  useEffect(() => {
    if (metric) {
      fetchDetailedReports();
    } else {
      fetchGlobalReports();
    }
  }, [metric]);

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

  const fetchDetailedReports = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/invoices/detailed-reports');
      setDetailedReports(data);
    } catch (err) {
      console.error('Error fetching detailed reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompany = (id) => {
    setExpandedCompanyId(expandedCompanyId === id ? null : id);
  };

  const getMetricTitle = () => {
    switch (metric) {
      case 'sales': return 'Overall Sales Detail';
      case 'purchases': return 'Overall Purchases Detail';
      case 'profit': return 'Overall Profit Detail';
      case 'transport': return 'Overall Transport Detail';
      case 'commission': return 'Overall Commission Detail';
      default: return 'Detailed Reports';
    }
  };

  const getMetricValue = (totals) => {
    switch (metric) {
      case 'sales': return totals?.sales || 0;
      case 'purchases': return totals?.purchases || 0;
      case 'profit': return totals?.profit || 0;
      case 'transport': return totals?.transport || 0;
      case 'commission': return totals?.commission || 0;
      default: return 0;
    }
  };

  const renderDetailedView = () => (
    <div className="glass-card">
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2 className="section-title">{getMetricTitle()} (Company-wise & Invoice-wise)</h2>
        <button className="btn-secondary" onClick={() => navigate('/super-admin')}>Back to Dashboard</button>
      </div>
      
      {loading ? <div className="loading-state">Loading detailed reports...</div> : (
        <div className="accordion-wrap">
          {detailedReports.length === 0 ? <div className="empty-row">No data available</div> : 
            detailedReports.map(comp => {
              const items = metric === 'purchases' ? comp.purchases : comp.invoices;
              
              // Calculate total directly from items with rounding to ensure visual math is perfect
              const metricTotal = items.reduce((sum, item) => {
                let amt = 0;
                if (metric === 'sales') amt = item.grandTotal;
                else if (metric === 'purchases') amt = item.totalAmount;
                else if (metric === 'profit') amt = item.totalProfit;
                else if (metric === 'transport') amt = item.transportCharges;
                else if (metric === 'commission') amt = item.commission;
                return sum + Math.round((amt || 0) * 100) / 100;
              }, 0);
              
              return (
                <div key={comp._id} className="accordion-item" style={{ marginBottom: '10px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div 
                    className="accordion-header" 
                    onClick={() => toggleCompany(comp._id)}
                    style={{ padding: '15px', backgroundColor: 'rgba(255,255,255,0.05)', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <span style={{ fontSize: '1.1rem', fontWeight: 'bold' }}>🏢 {comp.name}</span>
                      <span style={{ marginLeft: '10px', fontSize: '0.85rem', color: '#94a3b8' }}>GSTIN: {comp.gstin || 'N/A'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '1.1rem', color: '#10b981' }}>
                        ₹{metricTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                      </span>
                      <span>{expandedCompanyId === comp._id ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  
                  {expandedCompanyId === comp._id && (
                    <div className="accordion-content" style={{ padding: '15px', backgroundColor: 'rgba(0,0,0,0.2)' }}>
                      {items.length === 0 ? <p style={{ margin: 0, color: '#94a3b8', fontStyle: 'italic' }}>No {metric === 'purchases' ? 'purchases' : 'invoices'} found for this company.</p> : (
                        <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                              <th style={{ padding: '8px', textAlign: 'left' }}>{metric === 'purchases' ? 'Bill #' : 'Invoice #'}</th>
                              <th style={{ padding: '8px', textAlign: 'left' }}>Date</th>
                              <th style={{ padding: '8px', textAlign: 'left' }}>{metric === 'purchases' ? 'Supplier' : 'Customer'}</th>
                              <th style={{ padding: '8px', textAlign: 'right' }}>Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map(item => {
                              // Determine the amount to show for the specific invoice based on the metric
                              let itemAmount = 0;
                              if (metric === 'sales') itemAmount = item.grandTotal;
                              else if (metric === 'purchases') itemAmount = item.totalAmount;
                              else if (metric === 'profit') itemAmount = item.totalProfit;
                              else if (metric === 'transport') itemAmount = item.transportCharges;
                              else if (metric === 'commission') itemAmount = item.commission;

                              if (itemAmount === 0 && metric !== 'sales' && metric !== 'purchases') return null; // hide 0 profit/commission/transport rows for cleaner look

                              return (
                                <tr key={item._id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                  <td style={{ padding: '8px' }}>{metric === 'purchases' ? item.billNumber : item.invoiceNumber}</td>
                                  <td style={{ padding: '8px' }}>{new Date(item.date).toLocaleDateString()}</td>
                                  <td style={{ padding: '8px' }}>{metric === 'purchases' ? item.supplierName : item.customerName}</td>
                                  <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                                    ₹{(itemAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          }
        </div>
      )}
    </div>
  );

  const renderGlobalView = () => {
    const totalGlobalSales = reports.reduce((s, r) => s + r.totalSales, 0);
    const totalGlobalGst = reports.reduce((s, r) => s + r.totalGst, 0);

    return (
      <>
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
      </>
    );
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">{metric ? getMetricTitle() : 'Global Analytics'}</h1>
          <p className="page-subtitle">{metric ? 'Detailed breakdown of statistics by company and individual transactions' : 'Company-wise performance overview'}</p>
        </div>
        <div className="header-actions">
           <button className="btn-secondary" onClick={metric ? fetchDetailedReports : fetchGlobalReports}>🔄 Refresh Data</button>
        </div>
      </div>

      {metric ? renderDetailedView() : renderGlobalView()}
    </Layout>
  );
}
