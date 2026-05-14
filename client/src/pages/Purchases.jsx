import React, { useState, useEffect } from 'react';
import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import './Purchases.css';

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    productId: '',
    supplierName: '',
    supplierGstin: '',
    billNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    quantity: 0,
    rate: 0,
    gstRate: 18,
    isGst: true
  });

  const fetchPurchases = async () => {
    try {
      const { data } = await API.get('/purchases');
      setPurchases(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const { data } = await API.get('/products');
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchProducts();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/purchases', form);
      setShowForm(false);
      fetchPurchases();
      // Reset form
      setForm({
        productId: '',
        supplierName: '',
        supplierGstin: '',
        billNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        quantity: 0,
        rate: 0,
        gstRate: 18,
        isGst: true
      });
    } catch (err) {
      alert('Error saving purchase');
    }
  };

  const totalPurchaseValue = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Purchases</h1>
          <p className="page-subtitle">Track stock bought from suppliers</p>
        </div>
        <button id="add-purchase-btn" className="btn-primary" onClick={() => setShowForm(true)}>+ New Purchase</button>
      </div>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="glass-card stat-card-item" style={{ '--accent-color': '#10b981' }}>
          <div className="stat-icon-wrap">🛒</div>
          <div>
            <div className="stat-val">₹{totalPurchaseValue.toLocaleString()}</div>
            <div className="stat-lbl">Total Purchase Value</div>
          </div>
        </div>
        <div className="glass-card stat-card-item" style={{ '--accent-color': '#6366f1' }}>
          <div className="stat-icon-wrap">📦</div>
          <div>
            <div className="stat-val">{purchases.length}</div>
            <div className="stat-lbl">Total Purchase Records</div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="modal-overlay">
            <motion.div 
              className="modal glass-card"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <div className="modal-header">
                <h2>Record New Purchase</h2>
                <button className="close-btn" onClick={() => setShowForm(false)}>✕</button>
              </div>
              <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Select Product *</label>
                    <select 
                      className="input-field" 
                      required 
                      value={form.productId} 
                      onChange={e => setForm({...form, productId: e.target.value})}
                    >
                      <option value="">-- Choose Product --</option>
                      {products.map(p => <option key={p._id} value={p._id}>{p.name} ({p.sku})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Supplier Name *</label>
                    <input 
                      className="input-field" 
                      required 
                      value={form.supplierName} 
                      onChange={e => setForm({...form, supplierName: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Supplier GSTIN</label>
                    <input 
                      className="input-field" 
                      value={form.supplierGstin} 
                      onChange={e => setForm({...form, supplierGstin: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Bill Number *</label>
                    <input 
                      className="input-field" 
                      required 
                      value={form.billNumber} 
                      onChange={e => setForm({...form, billNumber: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      required 
                      value={form.quantity} 
                      onChange={e => setForm({...form, quantity: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Rate (Base Price) *</label>
                    <input 
                      type="number" 
                      className="input-field" 
                      required 
                      value={form.rate} 
                      onChange={e => setForm({...form, rate: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label>GST Rate (%)</label>
                    <select 
                      className="input-field" 
                      value={form.gstRate} 
                      onChange={e => setForm({...form, gstRate: e.target.value})}
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input 
                      type="checkbox" 
                      checked={form.isGst} 
                      onChange={e => setForm({...form, isGst: e.target.checked})} 
                    />
                    <label>Include GST</label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn-primary">Record Purchase</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="glass-card">
        <h2 className="section-title">Purchase History</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Bill No</th>
                <th>Supplier</th>
                <th>Product</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>GST</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="8" className="loading-state">Loading purchases...</td></tr>
              ) : purchases.length === 0 ? (
                <tr><td colSpan="8" className="empty-row">No purchases recorded yet.</td></tr>
              ) : (
                purchases.map(p => (
                  <tr key={p._id}>
                    <td>{new Date(p.purchaseDate).toLocaleDateString()}</td>
                    <td>{p.billNumber}</td>
                    <td>{p.supplierName}</td>
                    <td>{p.productId?.name}</td>
                    <td>{p.quantity}</td>
                    <td>₹{p.rate}</td>
                    <td>₹{p.totalGst.toFixed(2)}</td>
                    <td>₹{p.totalAmount.toFixed(2)}</td>
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
