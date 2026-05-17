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
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewBillNo, setViewBillNo] = useState(null);
  const [editForm, setEditForm] = useState(null);
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

  const supplierSuggestions = [];
  const seen = new Set();
  purchases.forEach(p => {
    if (p.supplierName && !seen.has(p.supplierName.toLowerCase())) {
      seen.add(p.supplierName.toLowerCase());
      supplierSuggestions.push({ name: p.supplierName, gstin: p.supplierGstin });
    }
  });

  const handleSupplierName = (val) => {
    let gstin = form.supplierGstin;
    const match = supplierSuggestions.find(s => s.name.toLowerCase() === val.toLowerCase());
    if (match && match.gstin) {
      gstin = match.gstin;
    }
    setForm({ ...form, supplierName: val, supplierGstin: gstin });
  };

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

  const handleEditSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...editForm,
        subTotal: editForm.quantity * editForm.rate,
      };
      if (editForm.isGst) {
        payload.totalGst = (payload.subTotal * editForm.gstRate) / 100;
        payload.totalAmount = payload.subTotal + payload.totalGst;
      } else {
        payload.totalGst = 0;
        payload.totalAmount = payload.subTotal;
      }
      
      await API.put(`/purchases/${editForm._id}`, payload);
      setShowEditModal(false);
      fetchPurchases();
    } catch (err) {
      alert('Error updating purchase line');
    } finally {
      setSaving(false);
    }
  };

  const openView = (billNo) => {
    setViewBillNo(billNo);
    setShowViewModal(true);
  };

  const openEdit = (p) => {
    setEditForm(p);
    setShowEditModal(true);
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
                      list="supplier-list"
                      value={form.supplierName} 
                      onChange={e => handleSupplierName(e.target.value)} 
                    />
                    <datalist id="supplier-list">
                      {supplierSuggestions.map((s, i) => (
                        <option key={i} value={s.name}>{s.gstin || 'No GSTIN'}</option>
                      ))}
                    </datalist>
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

        {showViewModal && viewBillNo && (
          <div className="modal-overlay">
            <motion.div className="modal glass-card" style={{ maxWidth: '800px', width: '90%' }}>
              <div className="modal-header">
                <h2>Bill Details: {viewBillNo}</h2>
                <button className="close-btn" onClick={() => setShowViewModal(false)}>✕</button>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Qty</th>
                      <th>Rate</th>
                      <th>GST</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.filter(p => p.billNumber === viewBillNo).map(p => (
                      <tr key={p._id}>
                        <td>{p.productId?.name}</td>
                        <td>{p.quantity}</td>
                        <td>₹{p.rate}</td>
                        <td>₹{p.totalGst.toFixed(2)}</td>
                        <td>₹{p.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}

        {showEditModal && editForm && (
          <div className="modal-overlay">
            <motion.div className="modal glass-card">
              <div className="modal-header">
                <h2>Edit Purchase Line</h2>
                <button className="close-btn" onClick={() => setShowEditModal(false)}>✕</button>
              </div>
              <form onSubmit={handleEditSave} className="modal-form">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Bill Number *</label>
                    <input className="input-field" required value={editForm.billNumber} onChange={e => setEditForm({...editForm, billNumber: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Purchase Date *</label>
                    <input type="date" className="input-field" required value={editForm.purchaseDate.split('T')[0]} onChange={e => setEditForm({...editForm, purchaseDate: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Supplier Name *</label>
                    <input className="input-field" required value={editForm.supplierName} onChange={e => setEditForm({...editForm, supplierName: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Quantity *</label>
                    <input type="number" step="any" className="input-field" required value={editForm.quantity} onChange={e => setEditForm({...editForm, quantity: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Rate *</label>
                    <input type="number" step="any" className="input-field" required value={editForm.rate} onChange={e => setEditForm({...editForm, rate: e.target.value})} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Update'}</button>
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
                      <div className="action-btns">
                        <button className="action-btn-icon view" onClick={() => openView(p.billNumber)} title="View Full Bill">👁️</button>
                        <button className="action-btn-icon edit" onClick={() => openEdit(p)} title="Edit Line Item">✏️</button>
                        <button className="action-btn-icon del" onClick={() => handleDelete(p._id)} title="Delete Purchase">🗑️</button>
                      </div>
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
