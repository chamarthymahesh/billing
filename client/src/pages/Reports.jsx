import React, { useState, useEffect } from 'react';

import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { generateBillingReportPDF } from '../utils/pdfExport';
import './Reports.css';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, gstr1, pnl
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsRes, invRes] = await Promise.all([
        API.get('/invoices/reports'),
        API.get('/invoices'),
      ]);
      setStats(statsRes.data);
      setInvoices(invRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter invoices by date
  const filteredInvoices = invoices.filter(inv => {
    const d = new Date(inv.date);
    if (dateRange.from && d < new Date(dateRange.from)) return false;
    if (dateRange.to && d > new Date(dateRange.to)) return false;
    return true;
  });

  // Monthly aggregation
  const monthlyData = filteredInvoices.reduce((acc, inv) => {
    const month = new Date(inv.date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    const existing = acc.find(a => a.month === month);
    if (existing) {
      existing.sales += inv.grandTotal;
      existing.gst += inv.totalGst || 0;
    } else {
      acc.push({ month, sales: inv.grandTotal, gst: inv.totalGst || 0 });
    }
    return acc;
  }, []);

  // Status breakdown
  const statusData = [
    { name: 'Paid', value: filteredInvoices.filter(i => i.status === 'paid').length },
    { name: 'Unpaid', value: filteredInvoices.filter(i => i.status === 'unpaid').length },
    { name: 'Partial', value: filteredInvoices.filter(i => i.status === 'partially_paid').length },
  ].filter(s => s.value > 0);

  // GST slab breakdown
  const gstSlabData = filteredInvoices.filter(i => i.isGst).reduce((acc, inv) => {
    inv.items?.forEach(item => {
      const slab = `GST ${item.gstRate || 0}%`;
      const existing = acc.find(a => a.name === slab);
      const gstAmt = (item.amount * (item.gstRate || 0)) / 100;
      if (existing) existing.value += gstAmt;
      else acc.push({ name: slab, value: gstAmt });
    });
    return acc;
  }, []);

  const summaryStats = stats ? [
    { label: 'Total Revenue', value: `₹${stats.totalSales?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: '💰', color: '#6366f1' },
    { label: 'Total GST Collected', value: `₹${stats.totalGst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: '🏛️', color: '#10b981' },
    { label: 'Total Commission', value: `₹${stats.totalCommission?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: '🤝', color: '#f59e0b' },
    { label: 'Total Transport', value: `₹${stats.totalTransport?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: '🚚', color: '#3b82f6' },
    { label: 'Total Invoices', value: stats.count, icon: '🧾', color: '#ec4899' },
  ] : [];

  const exportCSV = () => {
    const headers = ['Invoice#', 'Date', 'Customer', 'Type', 'Subtotal', 'GST', 'Transport', 'Commission', 'Total', 'Status'];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      new Date(inv.date).toLocaleDateString('en-IN'),
      inv.customer?.name,
      inv.isGst ? 'GST' : 'Non-GST',
      inv.subTotal,
      inv.totalGst || 0,
      inv.transportCharges || 0,
      inv.commission || 0,
      inv.grandTotal,
      inv.status
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billing_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const handleExportPDF = () => {
    generateBillingReportPDF(filteredInvoices, stats, dateRange);
  };

  const handleToggleCommission = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
      await API.put(`/invoices/${id}/commission`, { status: newStatus });
      loadData();
    } catch (err) {
      alert('Error updating commission status');
    }
  };

  const handleToggleStatus = async (id, currentStatus) => {
    try {
      let next;
      if (currentStatus === 'unpaid') next = 'partially_paid';
      else if (currentStatus === 'partially_paid') next = 'paid';
      else next = 'unpaid';
      
      await API.put(`/invoices/${id}/status`, { status: next });
      loadData();
    } catch (err) {
      alert('Error updating payment status');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">Analytics and financial reports</p>
        </div>
        <div className="header-actions">
          <button id="export-csv-btn" className="btn-secondary" onClick={exportCSV}>⬇ CSV</button>
          <button id="export-pdf-btn" className="btn-primary" onClick={handleExportPDF}>📄 Download PDF Report</button>
        </div>
      </div>


      {/* Report Tabs */}
      <div className="report-tabs">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 Overview</button>
        <button className={`tab-btn ${activeTab === 'gstr1' ? 'active' : ''}`} onClick={() => setActiveTab('gstr1')}>🏛️ GSTR-1 Report</button>
        <button className={`tab-btn ${activeTab === 'pnl' ? 'active' : ''}`} onClick={() => setActiveTab('pnl')}>💸 Profit & Loss</button>
      </div>

      {/* Date Range Filter */}
      <div className="glass-card filter-bar">
        <span className="filter-label">Filter by Date:</span>
        <div className="date-range">
          <input id="report-from" type="date" className="input-field" value={dateRange.from}
            onChange={e => setDateRange(d => ({ ...d, from: e.target.value }))} />
          <span>to</span>
          <input id="report-to" type="date" className="input-field" value={dateRange.to}
            onChange={e => setDateRange(d => ({ ...d, to: e.target.value }))} />
          <button className="btn-primary btn-sm" onClick={() => setDateRange({ from: '', to: '' })}>Clear</button>
        </div>
      </div>

      {loading ? <div className="loading-state">Loading reports...</div> : (
        <>
          {/* Summary Stats */}
          <div className="stat-grid" style={{ marginBottom: 24 }}>
            {summaryStats.map(card => (
              <div key={card.label} className="glass-card stat-card-item" style={{ '--accent-color': card.color }}>
                <div className="stat-icon-wrap">{card.icon}</div>
                <div>
                  <div className="stat-val">{card.value}</div>
                  <div className="stat-lbl">{card.label}</div>
                </div>
              </div>
            ))}
          </div>

          {activeTab === 'overview' && (
            <div className="reports-grid">
              {/* Existing charts... */}
              <div className="glass-card chart-card">
                <h2 className="section-title">Monthly Sales vs GST</h2>
                {monthlyData.length === 0 ? <p className="empty-chart">No data for selected range</p> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="month" stroke="#94a3b8" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                        formatter={v => [`₹${v.toLocaleString('en-IN')}`, '']} />
                      <Legend />
                      <Bar dataKey="sales" name="Total Sales" fill="#6366f1" radius={[4,4,0,0]} />
                      <Bar dataKey="gst" name="GST Collected" fill="#10b981" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>

              {/* Status Pie */}
              <div className="glass-card chart-card">
                <h2 className="section-title">Invoice Status Breakdown</h2>
                {statusData.length === 0 ? <p className="empty-chart">No data</p> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                        {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          )}

          {activeTab === 'gstr1' && (
            <div className="reports-grid-v">
              {/* B2B Table */}
              <div className="glass-card report-table-card">
                <h2 className="section-title">GSTR-1: B2B Invoices (Business to Business)</h2>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>GSTIN</th>
                        <th>Party Name</th>
                        <th>Inv No</th>
                        <th>Taxable Value</th>
                        <th>Total Tax</th>
                        <th>Place of Supply</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.gstr1?.b2b?.length === 0 ? <tr><td colSpan="6" className="empty-row">No B2B invoices</td></tr> :
                        stats?.gstr1?.b2b?.map((row, i) => (
                          <tr key={i}>
                            <td>{row.gstin}</td>
                            <td>{row.name}</td>
                            <td>{row.invoiceNo}</td>
                            <td>₹{row.taxableValue.toLocaleString('en-IN')}</td>
                            <td>₹{row.totalGst.toLocaleString('en-IN')}</td>
                            <td>{row.state}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>

              {/* HSN Summary */}
              <div className="glass-card report-table-card">
                <h2 className="section-title">HSN / SAC Summary</h2>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>HSN Code</th>
                        <th>Total Qty</th>
                        <th>Taxable Value</th>
                        <th>Total Tax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.values(stats?.gstr1?.hsnSummary || {}).length === 0 ? <tr><td colSpan="4" className="empty-row">No data</td></tr> :
                        Object.values(stats.gstr1.hsnSummary).map((row, i) => (
                          <tr key={i}>
                            <td>{row.hsn}</td>
                            <td>{row.qty}</td>
                            <td>₹{row.taxable.toLocaleString('en-IN')}</td>
                            <td>₹{row.tax.toLocaleString('en-IN')}</td>
                          </tr>
                        ))
                      }
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pnl' && (
            <div className="reports-grid-v">
              <div className="glass-card pnl-card">
                <h2 className="section-title">Profit & Loss Statement (Summary)</h2>
                <div className="pnl-rows">
                  <div className="pnl-row income">
                    <span>Revenue from Sales (A)</span>
                    <span className="val">₹{stats?.totalSales?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pnl-row expense">
                    <span>Purchase of Goods (B)</span>
                    <span className="val">₹{stats?.totalPurchases?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pnl-row expense">
                    <span>Commission Paid (C)</span>
                    <span className="val">₹{stats?.totalCommission?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pnl-row expense">
                    <span>Transport/Shipping (D)</span>
                    <span className="val">₹{stats?.totalTransport?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="pnl-divider"></div>
                  <div className={`pnl-row total ${(stats?.totalSales - stats?.totalPurchases - stats?.totalCommission - stats?.totalTransport) >= 0 ? 'profit' : 'loss'}`}>
                    <span>Net Profit / (Loss) (A - B - C - D)</span>
                    <span className="val">₹{(stats?.totalSales - stats?.totalPurchases - stats?.totalCommission - stats?.totalTransport).toLocaleString('en-IN')}</span>
                  </div>
                </div>
                <div className="pnl-info">
                  * Note: This is a simplified P&L based on recorded invoices and purchases.
                </div>
              </div>
            </div>
          )}

            {/* Customer Commission Report */}
            <div className="glass-card report-table-card" style={{ gridColumn: '1/-1' }}>
              <div className="card-header-flex">
                <h2 className="section-title">Customer-wise Commission Report</h2>
                <div className="commission-total">Total Commission: ₹{stats?.totalCommission?.toLocaleString('en-IN')}</div>
              </div>
              <div className="report-row-flex">
                <div className="commission-table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Customer Name</th>
                        <th>Total Commission Paid</th>
                        <th>Share %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats?.customerCommissionList?.length === 0 ? (
                        <tr><td colSpan="3" className="empty-row">No commission records found</td></tr>
                      ) : stats?.customerCommissionList?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="cust-name-cell">👤 {item.name}</td>
                          <td className="comm-val-cell">₹{item.total.toLocaleString('en-IN')}</td>
                          <td>
                            <div className="progress-bar-wrap">
                              <div className="progress-bar-fill" style={{ width: `${(item.total / (stats.totalCommission || 1)) * 100}%` }}></div>
                              <span className="percent-label">{((item.total / (stats.totalCommission || 1)) * 100).toFixed(1)}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="commission-chart-wrap">
                  <ResponsiveContainer width="100%" height={260}>
                    <PieChart>
                      <Pie 
                        data={stats?.customerCommissionList || []} 
                        cx="50%" 
                        cy="50%" 
                        innerRadius={60} 
                        outerRadius={80} 
                        paddingAngle={5} 
                        dataKey="total"
                      >
                        {(stats?.customerCommissionList || []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={v => `₹${v.toLocaleString('en-IN')}`} />
                      <Legend verticalAlign="bottom" height={36}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Transaction Table */}
            <div className="glass-card report-table-card" style={{ gridColumn: '1/-1' }}>
              <h2 className="section-title">Invoice Ledger ({filteredInvoices.length} records)</h2>
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
                      <th>Commission</th>
                      <th>Grand Total</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInvoices.length === 0 ? (
                      <tr><td colSpan="10" className="empty-row">No records</td></tr>
                    ) : filteredInvoices.map(inv => (
                      <tr key={inv._id}>
                        <td className="inv-num-cell">{inv.invoiceNumber}</td>
                        <td>{new Date(inv.date).toLocaleDateString('en-IN')}</td>
                        <td>{inv.customer?.name}</td>
                        <td><span className={`type-badge ${inv.isGst ? 'gst' : 'nongst'}`}>{inv.isGst ? 'GST' : 'Non-GST'}</span></td>
                        <td>₹{inv.subTotal?.toLocaleString('en-IN')}</td>
                        <td>₹{(inv.totalGst || 0).toLocaleString('en-IN')}</td>
                        <td>₹{(inv.transportCharges || 0).toLocaleString('en-IN')}</td>
                        <td>
                          <div className="commission-cell">
                            <span>₹{(inv.commission || 0).toLocaleString('en-IN')}</span>
                            {inv.commission > 0 && (
                              <button 
                                className={`comm-status-badge ${inv.commissionStatus || 'unpaid'}`}
                                onClick={() => handleToggleCommission(inv._id, inv.commissionStatus)}
                                title="Click to toggle Paid/Unpaid"
                              >
                                {inv.commissionStatus === 'paid' ? '✅ Paid' : '⏳ Unpaid'}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="grand-total">₹{inv.grandTotal?.toLocaleString('en-IN')}</td>
                        <td>
                          <button 
                            className={`badge badge-${inv.status}`} 
                            onClick={() => handleToggleStatus(inv._id, inv.status)}
                            title="Click to toggle status: Unpaid -> Partially -> Paid"
                          >
                            {inv.status.replace('_', ' ')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
        </>
      )}
    </Layout>
  );
}
