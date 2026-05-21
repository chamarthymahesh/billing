import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import './SuperAdmin.css'; // Reusing SuperAdmin styles

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [globalStats, setGlobalStats] = useState(null);
  const [companyCount, setCompanyCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [statsRes, compRes] = await Promise.all([
          API.get('/companies/global-stats'),
          API.get('/companies')
        ]);
        setGlobalStats(statsRes.data);
        setCompanyCount(compRes.data.length);
      } catch (err) {
        console.error('Error fetching dashboard stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const summaryStats = [
    { label: 'Total Companies', value: companyCount, icon: '🏢', color: '#6366f1', onClick: () => navigate('/super-admin/companies') },
    { label: 'All Invoices', value: 'View All', icon: '🧾', color: '#ec4899', onClick: () => navigate('/super-admin/invoices') },
    { label: 'Global Reports', value: 'Analytics', icon: '📊', color: '#f59e0b', onClick: () => navigate('/super-admin/reports') },
  ];

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Super Admin Dashboard</h1>
          <p className="page-subtitle">Global overview of all companies and operations</p>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading dashboard...</div>
      ) : (
        <>
          <div className="stat-grid" style={{ marginBottom: 32 }}>
            {summaryStats.map(card => (
              <div 
                key={card.label} 
                className={`glass-card stat-card-item ${card.onClick ? 'clickable' : ''}`} 
                style={{ '--accent-color': card.color }}
                onClick={card.onClick}
              >
                <div className="stat-icon-wrap">{card.icon}</div>
                <div>
                  <div className="stat-val">{card.value}</div>
                  <div className="stat-lbl">{card.label}</div>
                </div>
              </div>
            ))}
          </div>

          {globalStats && (
            <div>
              <h2 className="section-title" style={{ marginBottom: '20px' }}>Financial Overview</h2>
              <div className="stat-grid" style={{ marginBottom: 32 }}>
                <div className="glass-card stat-card-item clickable" style={{ '--accent-color': '#10b981' }} onClick={() => navigate('/super-admin/reports?metric=sales')}>
                  <div className="stat-icon-wrap">💰</div>
                  <div>
                    <div className="stat-val">₹{globalStats.totalSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    <div className="stat-lbl">Overall Sales</div>
                  </div>
                </div>
                <div className="glass-card stat-card-item clickable" style={{ '--accent-color': '#f43f5e' }} onClick={() => navigate('/super-admin/reports?metric=purchases')}>
                  <div className="stat-icon-wrap">🛒</div>
                  <div>
                    <div className="stat-val">₹{globalStats.totalPurchases.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    <div className="stat-lbl">Overall Purchases</div>
                  </div>
                </div>
                <div className="glass-card stat-card-item clickable" style={{ '--accent-color': '#8b5cf6' }} onClick={() => navigate('/super-admin/reports?metric=profit')}>
                  <div className="stat-icon-wrap">📈</div>
                  <div>
                    <div className="stat-val">₹{globalStats.totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    <div className="stat-lbl">Overall Profit</div>
                  </div>
                </div>
                <div className="glass-card stat-card-item clickable" style={{ '--accent-color': '#3b82f6' }} onClick={() => navigate('/super-admin/reports?metric=transport')}>
                  <div className="stat-icon-wrap">🚚</div>
                  <div>
                    <div className="stat-val">₹{globalStats.totalTransport.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    <div className="stat-lbl">Overall Transport</div>
                  </div>
                </div>
                <div className="glass-card stat-card-item clickable" style={{ '--accent-color': '#f59e0b' }} onClick={() => navigate('/super-admin/reports?metric=commission')}>
                  <div className="stat-icon-wrap">🤝</div>
                  <div>
                    <div className="stat-val">₹{globalStats.totalCommission.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    <div className="stat-lbl">Overall Commission</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
