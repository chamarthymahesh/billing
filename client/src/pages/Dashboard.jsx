import React, { useState, useEffect } from 'react';

import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import './Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalSales: 0, totalGst: 0, totalCommission: 0, totalTransport: 0, totalProfit: 0, count: 0 });
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, invRes] = await Promise.all([
          API.get('/invoices/reports'),
          API.get('/invoices'),
        ]);
        setStats(statsRes.data);
        setInvoices(invRes.data.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const chartData = [
    { name: 'Sales', value: stats.totalSales },
    { name: 'GST', value: stats.totalGst },
    { name: 'Commission', value: stats.totalCommission },
    { name: 'Transport', value: stats.totalTransport },
  ];

  const statCards = [
    { label: 'Total Sales', value: `₹${stats.totalSales?.toLocaleString('en-IN', {minimumFractionDigits:2})}`, icon: '💰', color: '#6366f1' },
    { label: 'Total GST', value: `₹${stats.totalGst?.toLocaleString('en-IN', {minimumFractionDigits:2})}`, icon: '🏛️', color: '#10b981' },
    { label: 'Overall Profit', value: `₹${(stats.totalProfit || 0).toLocaleString('en-IN', {minimumFractionDigits:2})}`, icon: '📈', color: '#22c55e' },
    { label: 'Commission', value: `₹${stats.totalCommission?.toLocaleString('en-IN', {minimumFractionDigits:2})}`, icon: '🤝', color: '#f59e0b' },
    { label: 'Transport', value: `₹${stats.totalTransport?.toLocaleString('en-IN', {minimumFractionDigits:2})}`, icon: '🚚', color: '#3b82f6' },
    { label: 'Total Invoices', value: stats.count, icon: '🧾', color: '#ec4899' },
  ];

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Overview of your billing activity</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading dashboard...</div>
      ) : (
        <>
          <div className="stat-grid">
            {statCards.map((card) => (
              <div key={card.label} className="glass-card stat-card-item" style={{ '--accent-color': card.color }}>
                <div className="stat-icon-wrap">{card.icon}</div>
                <div>
                  <div className="stat-val">{card.value}</div>
                  <div className="stat-lbl">{card.label}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="dashboard-bottom">
            <div className="glass-card chart-card">
              <h2 className="section-title">Financial Summary</h2>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    formatter={(v) => [`₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, '']}
                  />
                  <Bar dataKey="value" fill="#6366f1" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="glass-card recent-card">
              <h2 className="section-title">Recent Invoices</h2>
              <table className="recent-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr><td colSpan="4" className="empty-row">No invoices yet</td></tr>
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv._id}>
                        <td className="inv-num">{inv.invoiceNumber}</td>
                        <td>{inv.customer?.name}</td>
                        <td>₹{inv.grandTotal?.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>
                          <span className={`badge badge-${inv.status}`}>{inv.status}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
