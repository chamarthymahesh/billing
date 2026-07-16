import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import API from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import './StockAdjustment.css';

export default function StockAdjustment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedCompanies, setExpandedCompanies] = useState({});

  useEffect(() => {
    fetchNegativeStock();
  }, []);

  const fetchNegativeStock = async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/products/negative-stock');
      setGroups(data);
      // Auto-expand all companies
      const expanded = {};
      data.forEach(g => { expanded[g.companyId] = true; });
      setExpandedCompanies(expanded);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCompany = (companyId) => {
    setExpandedCompanies(prev => ({ ...prev, [companyId]: !prev[companyId] }));
  };

  const handleCreatePurchase = (product, companyId, companyName) => {
    navigate('/purchases', {
      state: {
        prefillProductId: product._id,
        prefillProductName: product.name,
        prefillCompanyId: companyId,
        prefillCompanyName: companyName,
      }
    });
  };

  // Filter by search
  const filteredGroups = groups
    .map(group => ({
      ...group,
      products: group.products.filter(p =>
        p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.brand?.toLowerCase().includes(search.toLowerCase()) ||
        p.sku?.toLowerCase().includes(search.toLowerCase())
      )
    }))
    .filter(group =>
      group.products.length > 0 ||
      group.companyName?.toLowerCase().includes(search.toLowerCase())
    );

  const totalNegative = groups.reduce((sum, g) => sum + g.products.length, 0);

  return (
    <Layout>
      <div className="sa-page">
        {/* Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">⚖️ Stock Adjustment</h1>
            <p className="page-subtitle">
              Products with negative stock — create purchase invoices to fix profit calculations
            </p>
          </div>
          <div className="sa-header-right">
            {totalNegative > 0 && (
              <div className="sa-alert-badge">
                ⚠️ {totalNegative} product{totalNegative !== 1 ? 's' : ''} need purchase invoices
              </div>
            )}
            <button className="btn-secondary" onClick={fetchNegativeStock}>
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="sa-search-bar">
          <input
            className="input-field"
            placeholder="🔍 Search by product name, brand or SKU..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Content */}
        {loading ? (
          <div className="loading-state">Loading negative stock data...</div>
        ) : filteredGroups.length === 0 ? (
          <motion.div
            className="glass-card sa-empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="sa-empty-icon">✅</div>
            <h2>All stocks are positive!</h2>
            <p>No products have negative stock. Your purchase invoices are up to date.</p>
          </motion.div>
        ) : (
          <div className="sa-groups">
            {filteredGroups.map((group, gIdx) => (
              <motion.div
                key={group.companyId}
                className="glass-card sa-group"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gIdx * 0.05 }}
              >
                {/* Company Header */}
                <div
                  className="sa-company-header"
                  onClick={() => toggleCompany(group.companyId)}
                >
                  <div className="sa-company-left">
                    <span className="sa-company-icon">🏢</span>
                    <div>
                      <div className="sa-company-name">{group.companyName}</div>
                      <div className="sa-company-count">
                        {group.products.length} product{group.products.length !== 1 ? 's' : ''} with negative stock
                      </div>
                    </div>
                  </div>
                  <div className="sa-company-right">
                    <span className={`sa-expand-icon ${expandedCompanies[group.companyId] ? 'open' : ''}`}>
                      ▼
                    </span>
                  </div>
                </div>

                {/* Products Table */}
                <AnimatePresence>
                  {expandedCompanies[group.companyId] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="sa-table-wrap"
                    >
                      <table className="sa-table">
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Product Name</th>
                            <th>Brand</th>
                            <th>SKU</th>
                            <th>Current Stock</th>
                            <th>Purchase Price</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {group.products.map((prod, idx) => (
                            <tr key={prod._id}>
                              <td>{idx + 1}</td>
                              <td className="sa-product-name">{prod.name}</td>
                              <td>{prod.brand || '—'}</td>
                              <td className="sa-sku">{prod.sku || '—'}</td>
                              <td>
                                <span className="sa-stock-negative">{prod.stock}</span>
                              </td>
                              <td>
                                {prod.purchasePrice
                                  ? `₹${Number(prod.purchasePrice).toLocaleString()}`
                                  : <span className="sa-no-price">Not set</span>}
                              </td>
                              <td>
                                <button
                                  className="sa-create-btn"
                                  onClick={() => handleCreatePurchase(prod, group.companyId, group.companyName)}
                                >
                                  📦 Create Purchase
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
