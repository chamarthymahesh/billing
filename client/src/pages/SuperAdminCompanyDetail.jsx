import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import './SuperAdmin.css';

export default function SuperAdminCompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [company, setCompany] = useState(null);
  const [profit, setProfit] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get company basic info
        const compRes = await API.get(`/companies/${id}`);
        setCompany(compRes.data);
        // Get detailed reports and compute profit for this company
        const detRes = await API.get('/invoices/detailed-reports');
        const compData = detRes.data.find(c => c._id === id);
        const profitTotal = compData?.invoices?.reduce((sum, inv) => sum + (inv.totalProfit || 0), 0) || 0;
        setProfit(profitTotal);
      } catch (err) {
        console.error('Error fetching company profit:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Company Profit</h1>
          <p className="page-subtitle">Profit details for {company?.name || ''}</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => navigate('/super-admin/companies')}>← Back to Companies</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">Loading...</div>
      ) : (
        <div className="stat-grid" style={{ marginTop: 24 }}>
          <div className="glass-card stat-card-item" style={{ '--accent-color': '#22c55e' }}>
            <div className="stat-icon-wrap">📈</div>
            <div>
              <div className="stat-val">₹{profit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="stat-lbl">Total Profit</div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
