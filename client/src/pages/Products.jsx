import React, { useState, useEffect } from 'react';

import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import './Products.css';

const EMPTY = { 
  name: '', 
  brand: '', 
  category: '', 
  sku: '', 
  barcode: '', 
  hsnCode: '', 
  unit: 'Pcs', 
  description: '', 
  purchasePrice: 0, 
  price: 0, 
  mrp: 0, 
  gstRate: 18, 
  stock: 0, 
  minStockLevel: 5,
  productType: 'Good' // Good or Service
};
const GST_RATES = [0, 5, 12, 18, 28];
const UNITS = ['Pcs', 'Kg', 'Ltr', 'Box', 'Doz', 'Mtr', 'Pkt', 'Set'];

export default function Products() {
  const [products, setProducts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchProducts = () => {
    setLoading(true);
    API.get('/products').then(r => setProducts(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchProducts(); }, []);

  const openAdd = () => { setForm(EMPTY); setEditing(null); setShowForm(true); };
  const openEdit = (p) => { setForm(p); setEditing(p._id); setShowForm(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await API.put(`/products/${editing}`, form);
      } else {
        await API.post('/products', form);
      }
      setShowForm(false);
      fetchProducts();
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving product');
    } finally {
      setSaving(false);
    }
  };

  const generateSKU = (name, category) => {
    if (!name) return '';
    const cat = (category || 'GEN').substring(0, 3).toUpperCase();
    const nam = name.substring(0, 3).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${cat}-${nam}-${rand}`;
  };

  const handleNameChange = (val) => {
    setForm(f => {
      const next = { ...f, name: val };
      if (!editing && !f.sku) next.sku = generateSKU(val, f.category);
      return next;
    });
  };

  const handleCategoryChange = (val) => {
    setForm(f => {
      const next = { ...f, category: val };
      if (!editing && !f.sku) next.sku = generateSKU(f.name, val);
      return next;
    });
  };

  const filtered = products.filter(p =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.sku?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Products / Services</h1>
          <p className="page-subtitle">Manage your product catalog</p>
        </div>
        <button id="add-product-btn" className="btn-primary" onClick={openAdd}>+ Add Product</button>
      </div>

      {showForm && (
        <div className="modal-overlay">
          <div className="modal glass-card">
            <div className="modal-header">
              <h2>{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button className="close-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form onSubmit={handleSave} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Product Name *</label>
                  <input className="input-field" required value={form.name}
                    onChange={e => handleNameChange(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>Brand</label>
                  <input className="input-field" placeholder="e.g. Samsung, Nike" value={form.brand}
                    onChange={e => setForm(f => ({ ...f, brand: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Product Type</label>
                  <select className="input-field" value={form.productType}
                    onChange={e => setForm(f => ({ ...f, productType: e.target.value }))}>
                    <option value="Good">📦 Physical Good</option>
                    <option value="Service">🛠️ Service</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <input className="input-field" placeholder="e.g. Electronics, Footwear" value={form.category}
                    onChange={e => handleCategoryChange(e.target.value)} />
                </div>
                <div className="form-group">
                  <label>SKU / Item Code</label>
                  <div className="sku-input-wrap">
                    <input className="input-field" placeholder="Product Code" value={form.sku}
                      onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} />
                    <button type="button" className="sku-gen-btn" title="Re-generate SKU"
                      onClick={() => setForm(f => ({ ...f, sku: generateSKU(f.name, f.category) }))}>🔄</button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Barcode (EAN/UPC)</label>
                  <input className="input-field" placeholder="Scan Barcode" value={form.barcode}
                    onChange={e => setForm(f => ({ ...f, barcode: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>HSN / SAC Code</label>
                  <input className="input-field" placeholder="GST Category" value={form.hsnCode}
                    onChange={e => setForm(f => ({ ...f, hsnCode: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Unit of Measure</label>
                  <select className="input-field" value={form.unit}
                    onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>GST Rate (%)</label>
                  <select className="input-field" value={form.gstRate}
                    onChange={e => setForm(f => ({ ...f, gstRate: Number(e.target.value) }))}>
                    {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                  </select>
                </div>
                <div className="form-divider" style={{ gridColumn: '1/-1', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '10px 0' }}></div>
                <div className="form-group">
                  <label>Purchase Price (₹)</label>
                  <input type="number" className="input-field" min="0" value={form.purchasePrice}
                    onChange={e => setForm(f => ({ ...f, purchasePrice: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label>Selling Price (₹) *</label>
                  <input type="number" className="input-field" required min="0" value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label>M.R.P. (₹)</label>
                  <input type="number" className="input-field" min="0" value={form.mrp}
                    onChange={e => setForm(f => ({ ...f, mrp: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label>Initial Stock</label>
                  <input type="number" className="input-field" min="0" value={form.stock}
                    onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label>Min Stock Level (Alert)</label>
                  <input type="number" className="input-field" min="0" value={form.minStockLevel}
                    onChange={e => setForm(f => ({ ...f, minStockLevel: Number(e.target.value) }))} />
                </div>
                <div className="form-group" style={{ gridColumn: '1/-1' }}>
                  <label>Description</label>
                  <textarea className="input-field" rows="2" placeholder="Product details..." value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" id="save-product-btn" className="btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editing ? 'Update' : 'Add Product')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="glass-card">
        <div className="table-filters">
          <input id="product-search" className="input-field search-input" placeholder="Search products..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <span className="count-badge">{filtered.length} products</span>
        </div>
        {loading ? <div className="loading-state">Loading products...</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product Details</th>
                  <th>Brand / Category</th>
                  <th>Pricing</th>
                  <th>Stock / Unit</th>
                  <th>GST</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan="6" className="empty-row">No products found</td></tr>
                ) : filtered.map(p => (
                  <tr key={p._id}>
                    <td>
                      <div className="product-name">{p.name}</div>
                      <div className="product-meta">SKU: {p.sku || 'N/A'} | HSN: {p.hsnCode || 'N/A'}</div>
                    </td>
                    <td>
                      <div className="brand-badge">{p.brand || 'No Brand'}</div>
                      <div className="category-text">{p.category || 'General'}</div>
                    </td>
                    <td className="price-cell">
                      <div className="selling-price">₹{Number(p.price).toLocaleString('en-IN')}</div>
                      <div className="mrp-text">MRP: ₹{p.mrp || 0}</div>
                    </td>
                    <td>
                      <div className={`stock-status ${p.stock <= p.minStockLevel ? 'stock-low' : 'stock-ok'}`}>
                        {p.stock} {p.unit}
                      </div>
                      {p.stock <= p.minStockLevel && <div className="low-stock-alert">Low Stock!</div>}
                    </td>
                    <td><span className="gst-badge">{p.gstRate}%</span></td>
                    <td>
                      <div className="action-btns">
                        <button className="action-btn-icon edit" onClick={() => openEdit(p)}>✏️</button>
                        <button className="action-btn-icon del" onClick={() => handleDelete(p._id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}
