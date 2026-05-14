import React, { useState, useEffect } from 'react';
import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import './GlobalStock.css';

export default function GlobalStock() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchGlobalStock = async () => {
    try {
      const { data } = await API.get('/purchases/global-stock');
      setStocks(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalStock();
  }, []);

  const filteredStocks = stocks.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.companyId?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.sku && s.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Global Stock Management</h1>
          <p className="page-subtitle">View inventory levels across all registered companies</p>
        </div>
      </div>

      <div className="glass-card" style={{ marginBottom: 24 }}>
        <div className="search-wrap">
          <input 
            type="text" 
            className="input-field search-input" 
            placeholder="Search by product name, SKU or company..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-card">
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Company</th>
                <th>Product Name</th>
                <th>SKU</th>
                <th>Current Stock</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="5" className="loading-state">Loading inventory data...</td></tr>
              ) : filteredStocks.length === 0 ? (
                <tr><td colSpan="5" className="empty-row">No stock data found matching "{searchTerm}"</td></tr>
              ) : (
                filteredStocks.map(s => (
                  <tr key={s._id}>
                    <td className="company-name-cell">{s.companyId?.name}</td>
                    <td>{s.name}</td>
                    <td>{s.sku || '-'}</td>
                    <td className="stock-val">{s.stock}</td>
                    <td>
                      <span className={`badge ${s.stock > 10 ? 'badge-gst' : 'badge-del'}`}>
                        {s.stock > 10 ? 'In Stock' : s.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Layout>
  );
}
