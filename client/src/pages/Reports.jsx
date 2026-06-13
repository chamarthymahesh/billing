import React, { useState, useEffect, useMemo } from 'react';

import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { generateBillingReportPDF } from '../utils/pdfExport';
import './Reports.css';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899'];

export default function Reports() {
  console.log('Reports component rendered');
  const [stats, setStats] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, commission, gstr1, pnl
  const [dateRange, setDateRange] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);
  
  // Commission specific states
  const [commVendorFilter, setCommVendorFilter] = useState('');
  const [commMonthFilter, setCommMonthFilter] = useState('');
  const [commStatusFilter, setCommStatusFilter] = useState('all');
  const [editCommission, setEditCommission] = useState(null); // { id, commission, commissionStatus, invoiceNumber, customerName }
  const [viewInvoice, setViewInvoice] = useState(null); // invoice object to view

  // Transport specific states
  const [transVendorFilter, setTransVendorFilter] = useState('');
  const [transMonthFilter, setTransMonthFilter] = useState('');
  const [transStatusFilter, setTransStatusFilter] = useState('all');
  const [editTransport, setEditTransport] = useState(null); // { id, transportCharges, transportStatus, invoiceNumber, customerName }

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

  const commissionInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (!(inv.commission > 0)) return false;
      if (commVendorFilter && !inv.customer?.name?.toLowerCase().includes(commVendorFilter.toLowerCase())) return false;
      if (commMonthFilter) {
        const invMonth = new Date(inv.date).toISOString().substring(0, 7); // "2026-05"
        if (invMonth !== commMonthFilter) return false;
      }
      if (commStatusFilter !== 'all' && (inv.commissionStatus || 'unpaid') !== commStatusFilter) return false;
      return true;
    });
  }, [invoices, commVendorFilter, commMonthFilter, commStatusFilter]);

  const commissionStats = useMemo(() => {
    let total = 0;
    let paid = 0;
    let unpaid = 0;
    commissionInvoices.forEach(inv => {
      total += inv.commission || 0;
      if (inv.commissionStatus === 'paid') paid += inv.commission || 0;
      else unpaid += inv.commission || 0;
    });
    return { total, paid, unpaid };
  }, [commissionInvoices]);

  const transportInvoices = useMemo(() => {
    return invoices.filter(inv => {
      if (!(inv.transportCharges > 0)) return false;
      if (transVendorFilter && !inv.customer?.name?.toLowerCase().includes(transVendorFilter.toLowerCase())) return false;
      if (transMonthFilter) {
        const invMonth = new Date(inv.date).toISOString().substring(0, 7);
        if (invMonth !== transMonthFilter) return false;
      }
      if (transStatusFilter !== 'all' && (inv.transportStatus || 'unpaid') !== transStatusFilter) return false;
      return true;
    });
  }, [invoices, transVendorFilter, transMonthFilter, transStatusFilter]);

  const transportStats = useMemo(() => {
    let total = 0;
    let paid = 0;
    let unpaid = 0;
    transportInvoices.forEach(inv => {
      total += inv.transportCharges || 0;
      if (inv.transportStatus === 'paid') paid += inv.transportCharges || 0;
      else unpaid += inv.transportCharges || 0;
    });
    return { total, paid, unpaid };
  }, [transportInvoices]);

  const summaryStats = stats ? [
    { label: 'Total Revenue', value: `₹${stats.totalSales?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: '💰', color: '#6366f1' },
    { label: 'Total GST Collected', value: `₹${stats.totalGst?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: '🏛️', color: '#10b981' },
    { label: 'Total Commission', value: `₹${stats.totalCommission?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: '🤝', color: '#f59e0b' },
    { label: 'Total Transport', value: `₹${stats.totalTransport?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, icon: '🚚', color: '#3b82f6' },
    { label: 'Total Invoices', value: stats.count, icon: '🧾', color: '#ec4899' },
  ] : [];

  const exportCSV = () => {
    const headers = ['Invoice#', 'Date', 'Customer', 'Type', 'Subtotal', 'GST', 'Transport', 'Commission', 'Total Profit', 'Grand Total', 'Status'];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      new Date(inv.date).toLocaleDateString('en-IN'),
      inv.customer?.name,
      inv.isGst ? 'GST' : 'Non-GST',
      inv.subTotal,
      inv.totalGst || 0,
      inv.transportCharges || 0,
      inv.commission || 0,
      inv.totalProfit || 0,
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

  const handleSaveCommissionDetails = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/invoices/${editCommission.id}/commission-details`, {
        commission: Number(editCommission.commission || 0),
        commissionStatus: editCommission.commissionStatus
      });
      setEditCommission(null);
      loadData();
    } catch (err) {
      alert('Error updating commission details');
    }
  };

  const handleDeleteCommission = async (id) => {
    if (!window.confirm('Are you sure you want to delete this commission record? This sets the commission for this order to ₹0.')) return;
    try {
      await API.put(`/invoices/${id}/commission-details`, {
        commission: 0,
        commissionStatus: 'unpaid'
      });
      loadData();
    } catch (err) {
      alert('Error deleting commission');
    }
  };

  const handleToggleTransport = async (id, currentStatus) => {
    try {
      const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid';
      const match = invoices.find(i => i._id === id);
      await API.put(`/invoices/${id}/transport-details`, {
        transportCharges: match ? match.transportCharges : 0,
        transportStatus: newStatus
      });
      loadData();
    } catch (err) {
      alert('Error updating transport status');
    }
  };

  const handleSaveTransportDetails = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/invoices/${editTransport.id}/transport-details`, {
        transportCharges: Number(editTransport.transportCharges || 0),
        transportStatus: editTransport.transportStatus
      });
      setEditTransport(null);
      loadData();
    } catch (err) {
      alert('Error updating transport details');
    }
  };

  const handleDeleteTransport = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transport record? This sets the transport charges for this order to ₹0.')) return;
    try {
      await API.put(`/invoices/${id}/transport-details`, {
        transportCharges: 0,
        transportStatus: 'unpaid'
      });
      loadData();
    } catch (err) {
      alert('Error deleting transport');
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
        <button className={`tab-btn ${activeTab === 'commission' ? 'active' : ''}`} onClick={() => setActiveTab('commission')}>🤝 Commission Tracker</button>
        <button className={`tab-btn ${activeTab === 'transport' ? 'active' : ''}`} onClick={() => setActiveTab('transport')}>🚚 Transport Tracker</button>
        <button className={`tab-btn ${activeTab === 'gstr1' ? 'active' : ''}`} onClick={() => setActiveTab('gstr1')}>🏛️ GSTR-1 Report</button>
        <button className={`tab-btn ${activeTab === 'pnl' ? 'active' : ''}`} onClick={() => setActiveTab('pnl')}>💸 Profit & Loss</button>
        <button className={`tab-btn ${activeTab === 'invoice-profits' ? 'active' : ''}`} onClick={() => setActiveTab('invoice-profits')}>📈 Invoice Profits</button>
      </div>

      {/* Date Range Filter */}
      {activeTab !== 'commission' && activeTab !== 'transport' && (
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
      )}

      {loading ? <div className="loading-state">Loading reports...</div> : (
        <>
          {/* Summary Stats */}
          {activeTab === 'commission' ? (
            <div className="stat-grid" style={{ marginBottom: 24 }}>
              <div className="glass-card stat-card-item" style={{ '--accent-color': '#f59e0b' }}>
                <div className="stat-icon-wrap">🤝</div>
                <div>
                  <div className="stat-val">₹{commissionStats.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  <div className="stat-lbl">Total Commission</div>
                </div>
              </div>
              <div className="glass-card stat-card-item" style={{ '--accent-color': '#10b981' }}>
                <div className="stat-icon-wrap">✅</div>
                <div>
                  <div className="stat-val">₹{commissionStats.paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  <div className="stat-lbl">Paid Commission</div>
                </div>
              </div>
              <div className="glass-card stat-card-item" style={{ '--accent-color': '#ef4444' }}>
                <div className="stat-icon-wrap">⏳</div>
                <div>
                  <div className="stat-val">₹{commissionStats.unpaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  <div className="stat-lbl">Pending Commission</div>
                </div>
              </div>
            </div>
          ) : activeTab === 'transport' ? (
            <div className="stat-grid" style={{ marginBottom: 24 }}>
              <div className="glass-card stat-card-item" style={{ '--accent-color': '#3b82f6' }}>
                <div className="stat-icon-wrap">🚚</div>
                <div>
                  <div className="stat-val">₹{transportStats.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  <div className="stat-lbl">Total Transport</div>
                </div>
              </div>
              <div className="glass-card stat-card-item" style={{ '--accent-color': '#10b981' }}>
                <div className="stat-icon-wrap">✅</div>
                <div>
                  <div className="stat-val">₹{transportStats.paid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  <div className="stat-lbl">Paid Transport</div>
                </div>
              </div>
              <div className="glass-card stat-card-item" style={{ '--accent-color': '#ef4444' }}>
                <div className="stat-icon-wrap">⏳</div>
                <div>
                  <div className="stat-val">₹{transportStats.unpaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  <div className="stat-lbl">Pending Transport</div>
                </div>
              </div>
            </div>
          ) : (
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
          )}

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
                        formatter={v => [`₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '']} />
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

          {activeTab === 'invoice-profits' && (
            <div className="reports-grid-v">
              <div className="glass-card report-table-card">
                <h2 className="section-title">Invoice-wise Net Profit ({filteredInvoices.length} invoices)</h2>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Date</th>
                        <th>Customer</th>
                        <th>Total Revenue</th>
                        <th>Cost & Deductions</th>
                        <th>Net Profit</th>
                        <th>Margin %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredInvoices.length === 0 ? (
                        <tr><td colSpan="7" className="empty-row">No invoices found for the selected range</td></tr>
                      ) : filteredInvoices.map(inv => {
                        const profit = Math.round((inv.totalProfit || 0) * 100) / 100;
                        const revenue = Math.round((inv.grandTotal || 0) * 100) / 100;
                        const margin = revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0;
                        const deductions = Math.round((revenue - profit) * 100) / 100;
                        // Prevent -0.00 display
                        const displayProfit = profit === 0 ? 0 : profit;
                        const displayDeductions = deductions === 0 ? 0 : deductions;
                        
                        return (
                          <tr key={inv._id}>
                            <td className="inv-num-cell">{inv.invoiceNumber}</td>
                            <td>{new Date(inv.date).toLocaleDateString('en-IN')}</td>
                            <td className="cust-name-cell">👤 {inv.customer?.name || 'N/A'}</td>
                            <td style={{ color: '#10b981' }}>₹{revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td style={{ color: '#ef4444' }}>₹{displayDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td style={{ fontWeight: 'bold', color: displayProfit >= 0 ? '#10b981' : '#ef4444' }}>
                              ₹{displayProfit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td>
                              <span className={`badge ${displayProfit >= 0 ? 'paid' : 'unpaid'}`}>{margin}%</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'commission' && (
            <div className="reports-grid-v">
              {/* Commission Filter Bar */}
              <div className="glass-card filter-bar commission-filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
                <span className="filter-label" style={{ fontWeight: '600', color: '#fff' }}>🔍 Filter Commissions:</span>
                <div className="date-range" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
                  <input
                    id="comm-vendor-search"
                    type="text"
                    placeholder="Filter by Vendor..."
                    className="input-field"
                    style={{ flex: 1, minWidth: '180px' }}
                    value={commVendorFilter}
                    onChange={e => setCommVendorFilter(e.target.value)}
                  />
                  <input
                    id="comm-month-select"
                    type="month"
                    className="input-field"
                    style={{ flex: 1, minWidth: '150px' }}
                    value={commMonthFilter}
                    onChange={e => setCommMonthFilter(e.target.value)}
                  />
                  <select
                    id="comm-status-select"
                    className="input-field"
                    style={{ flex: 1, minWidth: '150px' }}
                    value={commStatusFilter}
                    onChange={e => setCommStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                  <button className="btn-primary btn-sm" onClick={() => {
                    setCommVendorFilter('');
                    setCommMonthFilter('');
                    setCommStatusFilter('all');
                  }}>Clear Filters</button>
                </div>
              </div>

              {/* Commission Ledger Table */}
              <div className="glass-card report-table-card">
                <h2 className="section-title">Commission Ledger ({commissionInvoices.length} entries)</h2>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Order / Invoice #</th>
                        <th>Month</th>
                        <th>Date</th>
                        <th>Vendor / Party</th>
                        <th>Commission Amount</th>
                        <th>Payment Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {commissionInvoices.length === 0 ? (
                        <tr><td colSpan="7" className="empty-row">No commission records match your filters</td></tr>
                      ) : commissionInvoices.map(inv => {
                        const monthStr = new Date(inv.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                        return (
                          <tr key={inv._id}>
                            <td className="inv-num-cell">{inv.invoiceNumber}</td>
                            <td><strong>{monthStr}</strong></td>
                            <td>{new Date(inv.date).toLocaleDateString('en-IN')}</td>
                            <td className="cust-name-cell">👤 {inv.customer?.name || 'N/A'}</td>
                            <td className="comm-val-cell" style={{ fontWeight: 'bold', color: '#f59e0b' }}>
                              ₹{(inv.commission || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td>
                              <button
                                className={`comm-status-badge ${inv.commissionStatus || 'unpaid'}`}
                                onClick={() => handleToggleCommission(inv._id, inv.commissionStatus)}
                                title="Click to quickly toggle status"
                              >
                                {inv.commissionStatus === 'paid' ? '✅ Paid' : '⏳ Unpaid'}
                              </button>
                            </td>
                            <td>
                              <div className="action-btns" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                  className="action-btn view"
                                  style={{ padding: '4px 10px', fontSize: '12px' }}
                                  onClick={() => setViewInvoice(inv)}
                                  title="View Invoice & Commission Details"
                                >
                                  👁️
                                </button>
                                <button
                                  className="action-btn edit"
                                  style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.2)' }}
                                  onClick={() => setEditCommission({
                                    id: inv._id,
                                    commission: inv.commission,
                                    commissionStatus: inv.commissionStatus || 'unpaid',
                                    invoiceNumber: inv.invoiceNumber,
                                    customerName: inv.customer?.name || 'N/A'
                                  })}
                                  title="Edit Commission details"
                                >
                                  ✏️
                                </button>
                                <button
                                  className="action-btn delete"
                                  style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                  onClick={() => handleDeleteCommission(inv._id)}
                                  title="Delete/Clear Commission"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transport' && (
            <div className="reports-grid-v">
              {/* Transport Filter Bar */}
              <div className="glass-card filter-bar transport-filter-bar" style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', alignItems: 'center', marginBottom: '24px' }}>
                <span className="filter-label" style={{ fontWeight: '600', color: '#fff' }}>🔍 Filter Transport:</span>
                <div className="date-range" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
                  <input
                    id="trans-vendor-search"
                    type="text"
                    placeholder="Filter by Vendor..."
                    className="input-field"
                    style={{ flex: 1, minWidth: '180px' }}
                    value={transVendorFilter}
                    onChange={e => setTransVendorFilter(e.target.value)}
                  />
                  <input
                    id="trans-month-select"
                    type="month"
                    className="input-field"
                    style={{ flex: 1, minWidth: '150px' }}
                    value={transMonthFilter}
                    onChange={e => setTransMonthFilter(e.target.value)}
                  />
                  <select
                    id="trans-status-select"
                    className="input-field"
                    style={{ flex: 1, minWidth: '150px' }}
                    value={transStatusFilter}
                    onChange={e => setTransStatusFilter(e.target.value)}
                  >
                    <option value="all">All Statuses</option>
                    <option value="paid">Paid</option>
                    <option value="unpaid">Unpaid</option>
                  </select>
                  <button className="btn-primary btn-sm" onClick={() => {
                    setTransVendorFilter('');
                    setTransMonthFilter('');
                    setTransStatusFilter('all');
                  }}>Clear Filters</button>
                </div>
              </div>

              {/* Transport Ledger Table */}
              <div className="glass-card report-table-card">
                <h2 className="section-title">Transport Charges Ledger ({transportInvoices.length} entries)</h2>
                <div className="table-wrap">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Order / Invoice #</th>
                        <th>Month</th>
                        <th>Date</th>
                        <th>Vendor / Party</th>
                        <th>Transport Charges</th>
                        <th>Payment Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transportInvoices.length === 0 ? (
                        <tr><td colSpan="7" className="empty-row">No transport charge records match your filters</td></tr>
                      ) : transportInvoices.map(inv => {
                        const monthStr = new Date(inv.date).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                        return (
                          <tr key={inv._id}>
                            <td className="inv-num-cell">{inv.invoiceNumber}</td>
                            <td><strong>{monthStr}</strong></td>
                            <td>{new Date(inv.date).toLocaleDateString('en-IN')}</td>
                            <td className="cust-name-cell">👤 {inv.customer?.name || 'N/A'}</td>
                            <td className="trans-val-cell" style={{ fontWeight: 'bold', color: '#3b82f6' }}>
                              ₹{(inv.transportCharges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td>
                              <button
                                className={`comm-status-badge ${inv.transportStatus === 'paid' ? 'paid' : 'unpaid'}`}
                                onClick={() => handleToggleTransport(inv._id, inv.transportStatus || 'unpaid')}
                                title="Click to quickly toggle status"
                              >
                                {inv.transportStatus === 'paid' ? '✅ Paid' : '⏳ Unpaid'}
                              </button>
                            </td>
                            <td>
                              <div className="action-btns" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                <button
                                  className="action-btn view"
                                  style={{ padding: '4px 10px', fontSize: '12px' }}
                                  onClick={() => setViewInvoice(inv)}
                                  title="View Invoice & Transport Details"
                                >
                                  👁️
                                </button>
                                <button
                                  className="action-btn edit"
                                  style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: 'rgba(99, 102, 241, 0.1)', color: '#6366f1', border: '1px solid rgba(99, 102, 241, 0.2)' }}
                                  onClick={() => setEditTransport({
                                    id: inv._id,
                                    transportCharges: inv.transportCharges,
                                    transportStatus: inv.transportStatus || 'unpaid',
                                    invoiceNumber: inv.invoiceNumber,
                                    customerName: inv.customer?.name || 'N/A'
                                  })}
                                  title="Edit Transport details"
                                >
                                  ✏️
                                </button>
                                <button
                                  className="action-btn delete"
                                  style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                                  onClick={() => handleDeleteTransport(inv._id)}
                                  title="Delete/Clear Transport"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
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
                            <td>₹{row.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td>₹{row.totalGst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
                        Object.values(stats?.gstr1?.hsnSummary || {}).map((row, i) => (
                          <tr key={i}>
                            <td>{row.hsn}</td>
                            <td>{row.qty}</td>
                            <td>₹{row.taxable?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
                            <td>₹{row.tax?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</td>
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
                    <span className="val">₹{stats?.totalSales?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pnl-row expense">
                    <span>Purchase of Goods (B)</span>
                    <span className="val">₹{stats?.totalPurchases?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pnl-row expense">
                    <span>Commission Paid (C)</span>
                    <span className="val">₹{stats?.totalCommission?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pnl-row expense">
                    <span>Transport/Shipping (D)</span>
                    <span className="val">₹{stats?.totalTransport?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pnl-divider"></div>
                  <div className={`pnl-row total ${(stats?.totalSales - stats?.totalPurchases - stats?.totalCommission - stats?.totalTransport) >= 0 ? 'profit' : 'loss'}`}>
                    <span>Net Profit / (Loss) (A - B - C - D)</span>
                    <span className="val">₹{(stats?.totalSales - stats?.totalPurchases - stats?.totalCommission - stats?.totalTransport).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                <div className="commission-total">Total Commission: ₹{stats?.totalCommission?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
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
                          <td className="comm-val-cell">₹{item.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td>
                            <div className="progress-bar-wrap">
                              <div className="progress-bar-fill" style={{ width: `${(item.total / (stats?.totalCommission || 1)) * 100}%` }}></div>
                              <span className="percent-label">{((item.total / (stats?.totalCommission || 1)) * 100).toFixed(1)}%</span>
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
                      <Tooltip formatter={v => `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
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
                      <th>Est. Profit</th>
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
                        <td>₹{inv.subTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>₹{(inv.totalGst || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>₹{(inv.transportCharges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>
                          <div className="commission-cell">
                            <span>₹{(inv.commission || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                        <td style={{ color: '#10b981', fontWeight: 'bold' }}>
                          ₹{(inv.totalProfit || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="grand-total">₹{inv.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>
                          <button 
                            className={`badge badge-${inv.status || 'unpaid'}`} 
                            onClick={() => handleToggleStatus(inv._id, inv.status || 'unpaid')}
                            title="Click to toggle status: Unpaid -> Partially -> Paid"
                          >
                            {(inv.status || 'unpaid').replace('_', ' ')}
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

      {/* Edit Commission Modal */}
      {editCommission && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card modal-content" style={{ width: '100%', maxWidth: '480px', padding: '24px', position: 'relative', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: '600', color: '#fff', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>✏️ Edit Commission Details</h3>
            <form onSubmit={handleSaveCommissionDetails}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Order / Invoice No</label>
                <input type="text" className="input-field" value={editCommission.invoiceNumber} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Vendor / Customer Name</label>
                <input type="text" className="input-field" value={editCommission.customerName} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Commission Amount (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  required
                  value={editCommission.commission}
                  onChange={e => setEditCommission(prev => ({ ...prev, commission: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Payment Status</label>
                <select
                  className="input-field"
                  value={editCommission.commissionStatus}
                  onChange={e => setEditCommission(prev => ({ ...prev, commissionStatus: e.target.value }))}
                >
                  <option value="unpaid">⏳ Unpaid / Pending</option>
                  <option value="paid">✅ Paid</option>
                </select>
              </div>
              <div className="modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setEditCommission(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Invoice & Commission Details Modal */}
      {viewInvoice && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card modal-content" style={{ width: '100%', maxWidth: '720px', padding: '24px', maxHeight: '90vh', overflowY: 'auto', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0 0 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#fff' }}>👁️ Order Details - {viewInvoice.invoiceNumber}</h3>
              <button onClick={() => setViewInvoice(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
              <div>
                <h4 style={{ margin: '0 0 8px', color: '#6366f1', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Vendor / Customer</h4>
                <p style={{ margin: '0 0 4px', fontWeight: '600' }}>{viewInvoice.customer?.name}</p>
                <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#94a3b8' }}>{viewInvoice.customer?.address}</p>
                <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#94a3b8' }}>Phone: {viewInvoice.customer?.phone}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <h4 style={{ margin: '0 0 8px', color: '#6366f1', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Metadata</h4>
                <p style={{ margin: '0 0 4px' }}>Date: <strong>{new Date(viewInvoice.date).toLocaleDateString('en-IN')}</strong></p>
                <p style={{ margin: '0 0 4px' }}>GST Mode: <strong>{viewInvoice.isGst ? 'TAX INVOICE' : 'NON-GST INVOICE'}</strong></p>
                <p style={{ margin: '0 0 4px' }}>Invoice Status: <span className={`status-tag status-${viewInvoice.status}`} style={{ display: 'inline-block', fontSize: '11px', padding: '2px 8px' }}>{viewInvoice.status.toUpperCase()}</span></p>
              </div>
            </div>

            <h4 style={{ margin: '0 0 8px', color: '#6366f1', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Items List</h4>
            <div className="table-wrap" style={{ marginBottom: '20px' }}>
              <table className="data-table" style={{ fontSize: '13px' }}>
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    {viewInvoice.isGst && <th>GST</th>}
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {viewInvoice.items?.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.description}</td>
                      <td>{item.quantity}</td>
                      <td>₹{Number(item.rate).toFixed(2)}</td>
                      {viewInvoice.isGst && <td>{item.gstRate}%</td>}
                      <td>₹{Number(item.total).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px dashed rgba(245, 158, 11, 0.2)', borderRadius: '8px', padding: '12px' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#f59e0b', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>🤝 Commission Information</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                    <span>Recorded Amount:</span>
                    <strong style={{ color: '#f59e0b' }}>₹{(viewInvoice.commission || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span>Payout Status:</span>
                    <span className={`comm-status-badge ${viewInvoice.commissionStatus || 'unpaid'}`} style={{ margin: 0 }}>
                      {viewInvoice.commissionStatus === 'paid' ? '✅ Paid' : '⏳ Unpaid'}
                    </span>
                  </div>
                </div>
                <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px dashed rgba(59, 130, 246, 0.2)', borderRadius: '8px', padding: '12px' }}>
                  <h4 style={{ margin: '0 0 8px', color: '#3b82f6', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>🚚 Transport Information</h4>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
                    <span>Recorded Amount:</span>
                    <strong style={{ color: '#3b82f6' }}>₹{(viewInvoice.transportCharges || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                    <span>Payment Status:</span>
                    <span className={`comm-status-badge ${viewInvoice.transportStatus === 'paid' ? 'paid' : 'unpaid'}`} style={{ margin: 0 }}>
                      {viewInvoice.transportStatus === 'paid' ? '✅ Paid' : '⏳ Unpaid'}
                    </span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Subtotal:</span>
                  <span>₹{viewInvoice.subTotal?.toFixed(2)}</span>
                </div>
                {viewInvoice.isGst && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>GST Collected:</span>
                    <span>₹{viewInvoice.totalGst?.toFixed(2)}</span>
                  </div>
                )}
                {viewInvoice.transportCharges > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Transport Charges:</span>
                    <span>₹{viewInvoice.transportCharges?.toFixed(2)}</span>
                  </div>
                )}
                {viewInvoice.adjustment !== 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Adjustment:</span>
                    <span>₹{viewInvoice.adjustment?.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '6px', marginTop: '4px', color: '#fff' }}>
                  <span>Grand Total:</span>
                  <span>₹{viewInvoice.grandTotal?.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
              <button className="btn-secondary" onClick={() => setViewInvoice(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Edit Transport Modal */}
      {editTransport && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
          <div className="glass-card modal-content" style={{ width: '100%', maxWidth: '480px', padding: '24px', position: 'relative', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '20px', fontWeight: '600', color: '#fff', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', paddingBottom: '12px' }}>✏️ Edit Transport Details</h3>
            <form onSubmit={handleSaveTransportDetails}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Order / Invoice No</label>
                <input type="text" className="input-field" value={editTransport.invoiceNumber} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Vendor / Customer Name</label>
                <input type="text" className="input-field" value={editTransport.customerName} disabled style={{ opacity: 0.7, cursor: 'not-allowed' }} />
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Transport Charges (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  className="input-field"
                  required
                  value={editTransport.transportCharges}
                  onChange={e => setEditTransport(prev => ({ ...prev, transportCharges: e.target.value }))}
                />
              </div>
              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#94a3b8' }}>Payment Status</label>
                <select
                  className="input-field"
                  value={editTransport.transportStatus}
                  onChange={e => setEditTransport(prev => ({ ...prev, transportStatus: e.target.value }))}
                >
                  <option value="unpaid">⏳ Unpaid / Pending</option>
                  <option value="paid">✅ Paid</option>
                </select>
              </div>
              <div className="modal-actions" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setEditTransport(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
