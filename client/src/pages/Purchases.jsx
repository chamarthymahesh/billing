import React, { useState, useEffect } from 'react';
import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import './Purchases.css';

const EMPTY_ITEM = { productId: '', quantity: 1, rate: 0, gstRate: 18, isGst: true };

export default function Purchases() {
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    supplierName: '',
    supplierGstin: '',
    billNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'Pending',
    items: [{ ...EMPTY_ITEM }]
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

  const handleItemChange = (idx, field, val) => {
    const newItems = [...form.items];
    newItems[idx][field] = val;
    setForm({ ...form, items: newItems });
  };

  const addItem = () => {
    setForm({ ...form, items: [...form.items, { ...EMPTY_ITEM }] });
  };

  const removeItem = (idx) => {
    const newItems = form.items.filter((_, i) => i !== idx);
    setForm({ ...form, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const promises = form.items.map(item => {
        if (!item.productId) throw new Error("Please select a product for all items");
        const payload = {
          supplierName: form.supplierName,
          supplierGstin: form.supplierGstin,
          billNumber: form.billNumber,
          purchaseDate: form.purchaseDate,
          productId: item.productId,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          gstRate: Number(item.gstRate),
          isGst: item.isGst,
          paymentStatus: form.paymentStatus
        };
        return API.post('/purchases', payload);
      });
      
      await Promise.all(promises);
      
      setShowForm(false);
      fetchPurchases();
      // Reset form
      setForm({
        supplierName: '',
        supplierGstin: '',
        billNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        paymentStatus: 'Pending',
        items: [{ ...EMPTY_ITEM }]
      });
    } catch (err) {
      alert(err.message || 'Error saving purchase');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this purchase? This will reduce the product stock.')) return;
    try {
      await API.delete(`/purchases/${id}`);
      fetchPurchases();
    } catch (err) {
      alert('Error deleting purchase');
    }
  };

  const togglePaymentStatus = async (purchase) => {
    const newStatus = purchase.paymentStatus === 'Paid' ? 'Pending' : 'Paid';
    try {
      await API.put(`/purchases/${purchase._id}`, { paymentStatus: newStatus });
      fetchPurchases();
    } catch (err) {
      alert('Error updating payment status');
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
              style={{ maxWidth: '800px', width: '90%' }} // Made wider for items table
            >
              <div className="modal-header">
                <h2>Record New Purchase</h2>
                <button className="close-btn" onClick={() => setShowForm(false)}>✕</button>
              </div>
              <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                  <div className="form-group">
                    <label>Supplier Name *</label>
                    <input 
                      className="input-field highlight-input" 
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
                      className="input-field highlight-input" 
                      required 
                      value={form.billNumber} 
                      onChange={e => setForm({...form, billNumber: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Purchase Date *</label>
                    <input 
                      type="date"
                      className="input-field" 
                      required 
                      value={form.purchaseDate} 
                      onChange={e => setForm({...form, purchaseDate: e.target.value})} 
                    />
                  </div>
                  <div className="form-group">
                    <label>Payment Status</label>
                    <select 
                      className="input-field"
                      value={form.paymentStatus}
                      onChange={e => setForm({...form, paymentStatus: e.target.value})}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                </div>

                <div className="items-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0 }}>Products in this Bill</h3>
                  <button type="button" className="btn-primary btn-sm" onClick={addItem}>+ Add Item</button>
                </div>
                
                <div className="table-wrap" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th>Product</th>
                        <th>Qty</th>
                        <th>Rate (₹)</th>
                        <th>GST %</th>
                        <th>+ GST?</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>
                            <select 
                              className="input-field item-input" 
                              required 
                              value={item.productId} 
                              onChange={e => handleItemChange(idx, 'productId', e.target.value)}
                            >
                              <option value="">-- Choose Product --</option>
                              {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                            </select>
                          </td>
                          <td>
                            <input 
                              type="number" step="any"
                              className="input-field item-input sm" 
                              required 
                              value={item.quantity} 
                              onChange={e => handleItemChange(idx, 'quantity', e.target.value)} 
                            />
                          </td>
                          <td>
                            <input 
                              type="number" step="any"
                              className="input-field item-input sm" 
                              required 
                              value={item.rate} 
                              onChange={e => handleItemChange(idx, 'rate', e.target.value)} 
                            />
                          </td>
                          <td>
                            <select 
                              className="input-field item-input sm" 
                              value={item.gstRate} 
                              onChange={e => handleItemChange(idx, 'gstRate', e.target.value)}
                            >
                              <option value="0">0%</option>
                              <option value="5">5%</option>
                              <option value="12">12%</option>
                              <option value="18">18%</option>
                              <option value="28">28%</option>
                            </select>
                          </td>
                          <td>
                            <input 
                              type="checkbox" 
                              checked={item.isGst} 
                              onChange={e => handleItemChange(idx, 'isGst', e.target.checked)} 
                            />
                          </td>
                          <td>
                            {form.items.length > 1 && (
                              <button type="button" className="remove-btn" onClick={() => removeItem(idx)}>✕</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="modal-footer" style={{ marginTop: '20px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={saving}>
                    {saving ? 'Saving...' : 'Record Purchase'}
                  </button>
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
                <th>Total</th>
                <th>Payment Status</th>
                <th>Actions</th>
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
                    <td>₹{p.totalAmount.toFixed(2)}</td>
                    <td>
                      <span 
                        className={`badge ${p.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-pending'}`} 
                        style={{ cursor: 'pointer' }}
                        onClick={() => togglePaymentStatus(p)}
                        title="Click to toggle status"
                      >
                        {p.paymentStatus || 'Pending'}
                      </span>
                    </td>
                    <td>
                      <button className="action-btn-icon del" onClick={() => handleDelete(p._id)} title="Delete Purchase">🗑️</button>
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
