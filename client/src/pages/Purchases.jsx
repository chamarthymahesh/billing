import React, { useState, useEffect, useMemo } from 'react';
import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import './Purchases.css';

const customSelectStyles = {
  control: (base, state) => ({
    ...base,
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#fff',
    minHeight: '42px',
    boxShadow: 'none',
    '&:hover': {
      border: '1px solid rgba(99, 102, 241, 0.5)'
    }
  }),
  menu: (base) => ({
    ...base,
    background: '#1e293b',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 9999
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999
  }),
  option: (base, state) => ({
    ...base,
    background: state.isFocused ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
    color: '#fff',
    cursor: 'pointer',
    '&:active': {
      background: 'rgba(99, 102, 241, 0.4)'
    }
  }),
  singleValue: (base) => ({
    ...base,
    color: '#fff'
  }),
  input: (base) => ({
    ...base,
    color: '#fff'
  }),
  placeholder: (base) => ({
    ...base,
    color: '#94a3b8'
  })
};

const EMPTY_ITEM = { productId: '', quantity: 1, rate: 0, gstRate: 18, isGst: true };

export default function Purchases() {
  const { user } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [products, setProducts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewBillNo, setViewBillNo] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    companyId: '',
    supplierName: '',
    supplierGstin: '',
    billNumber: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'Pending',
    packagingCharges: '',
    transportCharges: '',
    miscCharges: '',
    items: [{ ...EMPTY_ITEM }]
  });
  const [editForm, setEditForm] = useState(null);
  const [search, setSearch] = useState('');

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
      const rawProducts = data || [];
      const myProducts = rawProducts.filter(p => p.companyId === user?.companyId);
      const otherProducts = rawProducts.filter(p => p.companyId !== user?.companyId);
      
      const myProductNames = new Set(myProducts.map(p => (p.name || '').toUpperCase().trim()));
      
      const filteredOtherProducts = [];
      const seenOtherNames = new Set();
      otherProducts.forEach(p => {
        const n = (p.name || '').toUpperCase().trim();
        if (!myProductNames.has(n) && !seenOtherNames.has(n)) {
          seenOtherNames.add(n);
          filteredOtherProducts.push(p);
        }
      });
      
      const finalProducts = [...myProducts, ...filteredOtherProducts].map(p => ({
        ...p,
        name: (p.name || '').toUpperCase()
      }));
      setProducts(finalProducts);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchCompanies = async () => {
    try {
      const { data } = await API.get('/companies');
      setCompanies(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchPurchases();
    fetchProducts();
    if (user?.role === 'superadmin') {
      fetchCompanies();
    }
  }, [user]);



  const localSupplierSuggestions = useMemo(() => {
    const map = {};
    purchases.forEach(p => {
      if (!p.supplierName) return;
      const key = p.supplierName.toLowerCase();
      if (!map[key]) {
        map[key] = { name: p.supplierName, gstin: p.supplierGstin || '' };
      } else if (!map[key].gstin && p.supplierGstin) {
        // upgrade to a record that has a GSTIN
        map[key].gstin = p.supplierGstin;
      }
    });
    return Object.values(map);
  }, [purchases]);

  const supplierSuggestions = localSupplierSuggestions;

  const handleSupplierName = (val, isEdit = false) => {
    let gstin = isEdit ? editForm.supplierGstin : form.supplierGstin;
    const match = supplierSuggestions.find(s => s.name.toLowerCase() === val.toLowerCase());
    if (match) {
      gstin = match.gstin || '';
    } else {
      if (!val.trim()) {
        gstin = '';
      } else {
        const wasMatched = supplierSuggestions.find(s => s.gstin && s.gstin === (isEdit ? editForm.supplierGstin : form.supplierGstin));
        if (wasMatched && wasMatched.name.toLowerCase() !== val.toLowerCase()) {
          gstin = '';
        }
      }
    }
    if (isEdit) {
      setEditForm({ ...editForm, supplierName: val, supplierGstin: gstin });
    } else {
      setForm({ ...form, supplierName: val, supplierGstin: gstin });
    }
  };

  const handleItemChange = (idx, field, val, isEdit = false) => {
    if (field === 'description') {
      val = (val || '').toUpperCase();
    }
    if (isEdit) {
      const newItems = [...editForm.items];
      newItems[idx][field] = val;
      setEditForm({ ...editForm, items: newItems });
    } else {
      const newItems = [...form.items];
      newItems[idx][field] = val;
      setForm({ ...form, items: newItems });
    }
  };

  const handleTotalChange = (idx, val, isEdit = false) => {
    const newTotal = Number(val) || 0;
    const targetForm = isEdit ? editForm : form;
    const items = [...targetForm.items];
    const item = items[idx];
    const qty = Number(item.quantity) || 1;
    const gstMultiplier = item.isGst ? (1 + Number(item.gstRate) / 100) : 1;
    
    // Calculate new base rate: Total / (Qty * (1 + GST%))
    const newRate = newTotal / (qty * gstMultiplier);
    
    items[idx] = { ...item, rate: parseFloat(newRate.toFixed(4)) };
    if (isEdit) {
      setEditForm({ ...targetForm, items });
    } else {
      setForm({ ...targetForm, items });
    }
  };

  const addItem = (isEdit = false) => {
    if (isEdit) {
      setEditForm({ ...editForm, items: [...editForm.items, { ...EMPTY_ITEM }] });
    } else {
      setForm({ ...form, items: [...form.items, { ...EMPTY_ITEM }] });
    }
  };

  const removeItem = (idx, isEdit = false) => {
    if (isEdit) {
      const newItems = editForm.items.filter((_, i) => i !== idx);
      setEditForm({ ...editForm, items: newItems });
    } else {
      const newItems = form.items.filter((_, i) => i !== idx);
      setForm({ ...form, items: newItems });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user.role === 'superadmin' && !form.companyId) {
      alert("Please select a target company");
      return;
    }
    if (!form.supplierName) {
      alert('Supplier Name is required.');
      setSaving(false);
      return;
    }
    setSaving(true);
    try {
      const promises = form.items.map(item => {
        if (!item.productId) throw new Error("Please select a product for all items");
        const payload = {
          companyId: user.role === 'superadmin' ? form.companyId : undefined,
          supplierName: form.supplierName,
          supplierGstin: form.supplierGstin,
          billNumber: form.billNumber,
          purchaseDate: form.purchaseDate,
          productId: item.productId,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
          gstRate: Number(item.gstRate),
          isGst: item.isGst,
          paymentStatus: form.paymentStatus,
          packagingCharges: Number(form.packagingCharges || 0),
          transportCharges: Number(form.transportCharges || 0),
          miscCharges: Number(form.miscCharges || 0)
        };
        return API.post('/purchases', payload);
      });
      
      await Promise.all(promises);
      setShowForm(false);
      // Refresh purchases and also the global product list, so newly purchased products appear in the Products view
      fetchPurchases();
      fetchProducts();
      setForm({
        companyId: '',
        supplierName: '', supplierGstin: '', billNumber: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        paymentStatus: 'Pending',
        packagingCharges: '',
        transportCharges: '',
        miscCharges: '',
        items: [{ ...EMPTY_ITEM }]
      });
    } catch (err) {
      alert(err.message || 'Error saving purchase');
    } finally {
      setSaving(false);
    }
  };

  const handleEditSave = async (e) => {
    e.preventDefault();
    if (user.role === 'superadmin' && !editForm.companyId) {
      alert("Please select a target company");
      return;
    }
    setSaving(true);
    try {
      for (const item of editForm.items) {
        if (!item.productId) throw new Error("Please select a product for all items");
      }
      const payload = {
        companyId: user.role === 'superadmin' ? editForm.companyId : undefined,
        supplierName: editForm.supplierName,
        supplierGstin: editForm.supplierGstin,
        billNumber: editForm.billNumber,
        purchaseDate: editForm.purchaseDate,
        paymentStatus: editForm.paymentStatus,
        packagingCharges: Number(editForm.packagingCharges || 0),
        transportCharges: Number(editForm.transportCharges || 0),
        miscCharges: Number(editForm.miscCharges || 0),
        items: editForm.items
      };
      // Call the new group PUT route
      await API.put(`/purchases/bill/${encodeURIComponent(editForm.oldBillNumber)}`, payload);
      setShowEditModal(false);
      fetchPurchases();
    } catch (err) {
      alert(err.message || 'Error updating bill');
    } finally {
      setSaving(false);
    }
  };

  const openView = (billNo) => {
    setViewBillNo(billNo);
    setShowViewModal(true);
  };

  const openEdit = (billGroup) => {
    setEditForm({
      companyId: billGroup.items[0]?.companyId?._id || billGroup.items[0]?.companyId || '',
      oldBillNumber: billGroup.billNumber,
      supplierName: billGroup.supplierName,
      supplierGstin: billGroup.items[0]?.supplierGstin || '',
      billNumber: billGroup.billNumber,
      purchaseDate: new Date(billGroup.purchaseDate).toISOString().split('T')[0],
      paymentStatus: billGroup.paymentStatus,
      packagingCharges: billGroup.packagingCharges || 0,
      transportCharges: billGroup.transportCharges || 0,
      miscCharges: billGroup.miscCharges || 0,
      items: billGroup.items.map(i => ({
        productId: i.productId?._id || '',
        quantity: i.quantity,
        rate: i.rate,
        gstRate: i.gstRate || 0,
        isGst: i.isGst || false
      }))
    });
    setShowEditModal(true);
  };

  const handleDeleteBill = async (billNumber, billGroup) => {
    if (!window.confirm('Are you sure you want to delete this entire bill? This will reduce the product stock for all items.')) return;
    try {
      const compId = user.role === 'superadmin' ? (billGroup?.items?.[0]?.companyId?._id || billGroup?.items?.[0]?.companyId) : '';
      const queryStr = compId ? `?companyId=${encodeURIComponent(compId)}` : '';
      await API.delete(`/purchases/bill/${encodeURIComponent(billNumber)}${queryStr}`);
      fetchPurchases();
    } catch (err) {
      alert('Error deleting bill');
    }
  };

  const togglePaymentStatus = async (billGroup) => {
    const newStatus = billGroup.paymentStatus === 'Paid' ? 'Pending' : 'Paid';
    try {
      // Just map through all items and update payment status to save time without recreating the bill
      const promises = billGroup.items.map(item => 
        API.put(`/purchases/${item._id}`, { paymentStatus: newStatus })
      );
      await Promise.all(promises);
      fetchPurchases();
    } catch (err) {
      alert('Error updating payment status');
    }
  };

  // Group purchases by billNumber
  const groupedPurchases = useMemo(() => {
    const groups = {};
    purchases.forEach(p => {
      if (!groups[p.billNumber]) {
        groups[p.billNumber] = {
          _id: p.billNumber, // Use billNumber as key
          billNumber: p.billNumber,
          supplierName: p.supplierName,
          purchaseDate: p.purchaseDate,
          paymentStatus: p.paymentStatus || 'Pending',
          totalItems: 0,
          totalAmount: 0,
          totalGst: 0,
          packagingCharges: p.packagingCharges || 0,
          transportCharges: p.transportCharges || 0,
          miscCharges: p.miscCharges || 0,
          items: []
        };
      }
      groups[p.billNumber].items.push(p);
      groups[p.billNumber].totalItems += p.quantity;
      groups[p.billNumber].totalGst += p.totalGst;
    });

    // Calculate grand total for each group including the charges
    Object.values(groups).forEach(g => {
      const itemsSum = g.items.reduce((sum, item) => sum + item.totalAmount, 0);
      g.totalAmount = itemsSum + (g.packagingCharges || 0) + (g.transportCharges || 0) + (g.miscCharges || 0);
    });

    // Convert to array and sort by date descending
    return Object.values(groups).sort((a, b) => new Date(b.purchaseDate) - new Date(a.purchaseDate));
  }, [purchases]);

  const totalPurchaseValue = groupedPurchases.reduce((sum, g) => sum + g.totalAmount, 0);

  // Filter grouped purchases by product name, bill number, or supplier
  const filteredGroupedPurchases = useMemo(() => {
    if (!search.trim()) return groupedPurchases;
    const q = search.toLowerCase().trim();
    return groupedPurchases.filter(g => {
      if (g.billNumber?.toLowerCase().includes(q)) return true;
      if (g.supplierName?.toLowerCase().includes(q)) return true;
      // Check if any item's product name matches
      return g.items.some(item => item.productId?.name?.toLowerCase().includes(q));
    });
  }, [groupedPurchases, search]);

  const calculatedFormTotal = useMemo(() => {
    let itemsSum = 0;
    form.items.forEach(item => {
      const q = Number(item.quantity || 0);
      const r = Number(item.rate || 0);
      const sub = q * r;
      let gst = 0;
      if (item.isGst) {
        gst = (sub * Number(item.gstRate || 0)) / 100;
      }
      itemsSum += sub + gst;
    });
    const extra = Number(form.packagingCharges || 0) + Number(form.transportCharges || 0) + Number(form.miscCharges || 0);
    return {
      itemsSum,
      extra,
      grandTotal: itemsSum + extra
    };
  }, [form]);

  const calculatedEditFormTotal = useMemo(() => {
    if (!editForm) return { itemsSum: 0, extra: 0, grandTotal: 0 };
    let itemsSum = 0;
    editForm.items.forEach(item => {
      const q = Number(item.quantity || 0);
      const r = Number(item.rate || 0);
      const sub = q * r;
      let gst = 0;
      if (item.isGst) {
        gst = (sub * Number(item.gstRate || 0)) / 100;
      }
      itemsSum += sub + gst;
    });
    const extra = Number(editForm.packagingCharges || 0) + Number(editForm.transportCharges || 0) + Number(editForm.miscCharges || 0);
    return {
      itemsSum,
      extra,
      grandTotal: itemsSum + extra
    };
  }, [editForm]);

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
            <div className="stat-val">{groupedPurchases.length}</div>
            <div className="stat-lbl">Total Purchase Bills</div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {/* ADD FORM */}
        {showForm && (
          <div className="modal-overlay">
            <motion.div className="modal glass-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ maxWidth: '900px', width: '95%' }}>
              <div className="modal-header">
                <h2>Record New Purchase Bill</h2>
                <button className="close-btn" onClick={() => setShowForm(false)}>✕</button>
              </div>
              <form onSubmit={handleSubmit} className="modal-form">
                <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                  {user?.role === 'superadmin' && (
                    <div className="form-group">
                      <label>Target Company *</label>
                      <select 
                        className="input-field highlight-input" 
                        required 
                        value={form.companyId} 
                        onChange={e => setForm({...form, companyId: e.target.value})}
                      >
                        <option value="">-- Choose Target Company --</option>
                        {companies.map(c => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                    <div className="form-group">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <label style={{ margin: 0 }}>Supplier Name *</label>
                      </div>
                      <CreatableSelect 
                        styles={customSelectStyles}
                        required 
                        menuPortalTarget={document.body}
                        menuPosition="fixed"
                        value={form.supplierName ? { label: form.supplierName, value: form.supplierName } : null}
                        onChange={opt => handleSupplierName(opt ? opt.value : '')} 
                        options={supplierSuggestions.map(s => ({ value: s.name, label: `${s.name} ${s.gstin ? `- ${s.gstin}` : ''}` }))}
                        placeholder="Search or add supplier..."
                        isClearable
                      />
                    </div>
                  <div className="form-group">
                    <label>Supplier GSTIN</label>
                    <input className="input-field" value={form.supplierGstin} onChange={e => setForm({...form, supplierGstin: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Bill Number *</label>
                    <input className="input-field highlight-input" required value={form.billNumber} onChange={e => setForm({...form, billNumber: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Purchase Date *</label>
                    <input type="date" className="input-field" required value={form.purchaseDate} onChange={e => setForm({...form, purchaseDate: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Payment Status</label>
                    <select className="input-field" value={form.paymentStatus} onChange={e => setForm({...form, paymentStatus: e.target.value})}>
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                </div>

                <div className="items-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0 }}>Products in this Bill</h3>
                  <button type="button" className="btn-primary btn-sm" onClick={() => addItem()}>+ Add Item</button>
                </div>
                
                <div className="table-wrap" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th style={{ width: '35%' }}>Product</th>
                        <th style={{ width: '12%' }}>Qty</th>
                        <th style={{ width: '15%' }}>Rate (₹)</th>
                        <th style={{ width: '10%' }}>GST %</th>
                        <th style={{ width: '8%' }}>+ GST?</th>
                        <th style={{ width: '15%' }}>Total (₹)</th>
                        <th style={{ width: '5%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.map((item, idx) => {
                        const sub = Number(item.quantity || 0) * Number(item.rate || 0);
                        const gst = item.isGst ? (sub * Number(item.gstRate || 0)) / 100 : 0;
                        const total = sub + gst;
                        
                        return (
                          <tr key={idx}>
                            <td>
                              <Select
                                styles={customSelectStyles}
                                required
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                                value={products.filter(p => p._id === item.productId).map(p => ({ value: p._id, label: p.name }))[0] || null}
                                onChange={opt => handleItemChange(idx, 'productId', opt ? opt.value : '')}
                                options={products.map(p => ({ value: p._id, label: p.name }))}
                                placeholder="Search product..."
                                isClearable
                              />
                            </td>
                            <td>
                              <input type="number" step="any" className="input-field item-input sm" required value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value)} />
                            </td>
                            <td>
                              <input type="number" step="any" className="input-field item-input sm" required value={item.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value)} />
                            </td>
                            <td>
                              <select className="input-field item-input sm" value={item.gstRate} onChange={e => handleItemChange(idx, 'gstRate', e.target.value)}>
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                              </select>
                            </td>
                            <td>
                              <input type="checkbox" checked={item.isGst} onChange={e => handleItemChange(idx, 'isGst', e.target.checked)} />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                step="any" 
                                className="input-field item-input sm highlight-input" 
                                value={total ? Number(total.toFixed(2)) : ''} 
                                onChange={e => handleTotalChange(idx, e.target.value)} 
                              />
                            </td>
                            <td>
                              {form.items.length > 1 && <button type="button" className="remove-btn" onClick={() => removeItem(idx)}>✕</button>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="charges-summary-section" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginTop: '20px', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="charges-inputs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Packaging Charges (₹)</label>
                      <input type="number" step="any" className="input-field" style={{ padding: '8px' }} value={form.packagingCharges} onChange={e => setForm({...form, packagingCharges: e.target.value})} placeholder="0" />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Transport Charges (₹)</label>
                      <input type="number" step="any" className="input-field" style={{ padding: '8px' }} value={form.transportCharges} onChange={e => setForm({...form, transportCharges: e.target.value})} placeholder="0" />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Other Misc (₹)</label>
                      <input type="number" step="any" className="input-field" style={{ padding: '8px' }} value={form.miscCharges} onChange={e => setForm({...form, miscCharges: e.target.value})} placeholder="0" />
                    </div>
                  </div>
                  <div className="live-totals-preview" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', paddingRight: '10px' }}>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}>Items Total: ₹{calculatedFormTotal.itemsSum.toFixed(2)}</div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}>Extra Charges: +₹{calculatedFormTotal.extra.toFixed(2)}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981' }}>Grand Total: ₹{calculatedFormTotal.grandTotal.toFixed(2)}</div>
                  </div>
                </div>

                <div className="modal-footer" style={{ marginTop: '20px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Record Purchase'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* EDIT FORM */}
        {showEditModal && editForm && (
          <div className="modal-overlay">
            <motion.div className="modal glass-card" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} style={{ maxWidth: '900px', width: '95%' }}>
              <div className="modal-header">
                <h2>Edit Purchase Bill</h2>
                <button className="close-btn" onClick={() => setShowEditModal(false)}>✕</button>
              </div>
              <form onSubmit={handleEditSave} className="modal-form">
                <div className="form-grid-2" style={{ marginBottom: '20px' }}>
                  {user?.role === 'superadmin' && (
                    <div className="form-group">
                      <label>Target Company *</label>
                      <select 
                        className="input-field highlight-input" 
                        required 
                        value={editForm.companyId} 
                        onChange={e => setEditForm({...editForm, companyId: e.target.value})}
                      >
                        <option value="">-- Choose Target Company --</option>
                        {companies.map(c => (
                          <option key={c._id} value={c._id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="form-group">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <label style={{ margin: 0 }}>Supplier Name *</label>
                    </div>
                    <CreatableSelect 
                      styles={customSelectStyles}
                      required 
                      menuPortalTarget={document.body}
                      menuPosition="fixed"
                      value={editForm.supplierName ? { label: editForm.supplierName, value: editForm.supplierName } : null}
                      onChange={opt => handleSupplierName(opt ? opt.value : '', true)} 
                      options={supplierSuggestions.map(s => ({ value: s.name, label: `${s.name} ${s.gstin ? `- ${s.gstin}` : ''}` }))}
                      placeholder="Search or add supplier..."
                      isClearable
                    />
                  </div>
                  <div className="form-group">
                    <label>Supplier GSTIN</label>
                    <input className="input-field" value={editForm.supplierGstin} onChange={e => setEditForm({...editForm, supplierGstin: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Bill Number *</label>
                    <input className="input-field highlight-input" required value={editForm.billNumber} onChange={e => setEditForm({...editForm, billNumber: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Purchase Date *</label>
                    <input type="date" className="input-field" required value={editForm.purchaseDate} onChange={e => setEditForm({...editForm, purchaseDate: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>Payment Status</label>
                    <select className="input-field" value={editForm.paymentStatus} onChange={e => setEditForm({...editForm, paymentStatus: e.target.value})}>
                      <option value="Pending">Pending</option>
                      <option value="Paid">Paid</option>
                    </select>
                  </div>
                </div>

                <div className="items-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <h3 style={{ margin: 0 }}>Products in this Bill</h3>
                  <button type="button" className="btn-primary btn-sm" onClick={() => addItem(true)}>+ Add Item</button>
                </div>
                
                <div className="table-wrap" style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  <table className="items-table">
                    <thead>
                      <tr>
                        <th style={{ width: '35%' }}>Product</th>
                        <th style={{ width: '12%' }}>Qty</th>
                        <th style={{ width: '15%' }}>Rate (₹)</th>
                        <th style={{ width: '10%' }}>GST %</th>
                        <th style={{ width: '8%' }}>+ GST?</th>
                        <th style={{ width: '15%' }}>Total (₹)</th>
                        <th style={{ width: '5%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {editForm.items.map((item, idx) => {
                        const sub = Number(item.quantity || 0) * Number(item.rate || 0);
                        const gst = item.isGst ? (sub * Number(item.gstRate || 0)) / 100 : 0;
                        const total = sub + gst;
                        
                        return (
                          <tr key={idx}>
                            <td>
                              <Select
                                styles={customSelectStyles}
                                required
                                menuPortalTarget={document.body}
                                menuPosition="fixed"
                                value={products.filter(p => p._id === item.productId).map(p => ({ value: p._id, label: p.name }))[0] || null}
                                onChange={opt => handleItemChange(idx, 'productId', opt ? opt.value : '', true)}
                                options={products.map(p => ({ value: p._id, label: p.name }))}
                                placeholder="Search product..."
                                isClearable
                              />
                            </td>
                            <td>
                              <input type="number" step="any" className="input-field item-input sm" required value={item.quantity} onChange={e => handleItemChange(idx, 'quantity', e.target.value, true)} />
                            </td>
                            <td>
                              <input type="number" step="any" className="input-field item-input sm" required value={item.rate} onChange={e => handleItemChange(idx, 'rate', e.target.value, true)} />
                            </td>
                            <td>
                              <select className="input-field item-input sm" value={item.gstRate} onChange={e => handleItemChange(idx, 'gstRate', e.target.value, true)}>
                                <option value="0">0%</option>
                                <option value="5">5%</option>
                                <option value="12">12%</option>
                                <option value="18">18%</option>
                                <option value="28">28%</option>
                              </select>
                            </td>
                            <td>
                              <input type="checkbox" checked={item.isGst} onChange={e => handleItemChange(idx, 'isGst', e.target.checked, true)} />
                            </td>
                            <td>
                              <input 
                                type="number" 
                                step="any" 
                                className="input-field item-input sm highlight-input" 
                                value={total ? Number(total.toFixed(2)) : ''} 
                                onChange={e => handleTotalChange(idx, e.target.value, true)} 
                              />
                            </td>
                            <td>
                              {editForm.items.length > 1 && <button type="button" className="remove-btn" onClick={() => removeItem(idx, true)}>✕</button>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="charges-summary-section" style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '20px', marginTop: '20px', background: 'rgba(255,255,255,0.03)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div className="charges-inputs" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                    <div className="form-group">
                      <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Packaging Charges (₹)</label>
                      <input type="number" step="any" className="input-field" style={{ padding: '8px' }} value={editForm.packagingCharges} onChange={e => setEditForm({...editForm, packagingCharges: e.target.value})} placeholder="0" />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Transport Charges (₹)</label>
                      <input type="number" step="any" className="input-field" style={{ padding: '8px' }} value={editForm.transportCharges} onChange={e => setEditForm({...editForm, transportCharges: e.target.value})} placeholder="0" />
                    </div>
                    <div className="form-group">
                      <label style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Other Misc (₹)</label>
                      <input type="number" step="any" className="input-field" style={{ padding: '8px' }} value={editForm.miscCharges} onChange={e => setEditForm({...editForm, miscCharges: e.target.value})} placeholder="0" />
                    </div>
                  </div>
                  <div className="live-totals-preview" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'center', paddingRight: '10px' }}>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}>Items Total: ₹{calculatedEditFormTotal.itemsSum.toFixed(2)}</div>
                    <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '4px' }}>Extra Charges: +₹{calculatedEditFormTotal.extra.toFixed(2)}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#10b981' }}>Grand Total: ₹{calculatedEditFormTotal.grandTotal.toFixed(2)}</div>
                  </div>
                </div>

                <div className="modal-footer" style={{ marginTop: '20px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}

        {/* VIEW MODAL */}
        {showViewModal && viewBillNo && (() => {
          const viewGroup = groupedPurchases.find(g => g.billNumber === viewBillNo);
          return (
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
                {viewGroup && (
                  <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '15px' }}>
                    <div style={{ fontSize: '0.95rem', color: '#94a3b8' }}>Items Total: ₹{(viewGroup.totalAmount - (viewGroup.packagingCharges || 0) - (viewGroup.transportCharges || 0) - (viewGroup.miscCharges || 0)).toFixed(2)}</div>
                    <div style={{ fontSize: '0.95rem', color: '#94a3b8' }}>Packaging Charges: +₹{(viewGroup.packagingCharges || 0).toFixed(2)}</div>
                    <div style={{ fontSize: '0.95rem', color: '#94a3b8' }}>Transport Charges: +₹{(viewGroup.transportCharges || 0).toFixed(2)}</div>
                    <div style={{ fontSize: '0.95rem', color: '#94a3b8' }}>Other Misc Charges: +₹{(viewGroup.miscCharges || 0).toFixed(2)}</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#10b981', marginTop: '5px' }}>Grand Total: ₹{viewGroup.totalAmount.toFixed(2)}</div>
                  </div>
                )}
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>

      <div className="glass-card">
        <h2 className="section-title">Purchase History (Grouped by Bill)</h2>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <input
            id="purchase-search"
            className="input-field search-input"
            style={{ flex: 1 }}
            placeholder="🔍 Search by product name, bill no, or supplier..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="btn-secondary" style={{ padding: '8px 16px', whiteSpace: 'nowrap' }} onClick={() => setSearch('')}>✕ Clear</button>
          )}
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Bill No</th>
                {user?.role === 'superadmin' && <th>Company</th>}
                <th>Supplier</th>
                <th>Total Items</th>
                <th>GST Amt</th>
                <th>Total Bill</th>
                <th>Payment Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={user?.role === 'superadmin' ? 9 : 8} className="loading-state">Loading purchases...</td></tr>
              ) : filteredGroupedPurchases.length === 0 ? (
                <tr><td colSpan={user?.role === 'superadmin' ? 9 : 8} className="empty-row">{search ? `No purchases found matching "${search}"` : 'No purchases recorded yet.'}</td></tr>
              ) : (
                filteredGroupedPurchases.map(g => (
                  <tr key={g._id}>
                    <td>{new Date(g.purchaseDate).toLocaleDateString()}</td>
                    <td><div className="badge">{g.billNumber}</div></td>
                    {user?.role === 'superadmin' && <td>{g.items[0]?.companyId?.name || g.items[0]?.companyId || 'N/A'}</td>}
                    <td>{g.supplierName}</td>
                    <td>{g.totalItems}</td>
                    <td>₹{g.totalGst.toFixed(2)}</td>
                    <td><strong style={{ color: '#10b981' }}>₹{g.totalAmount.toFixed(2)}</strong></td>
                    <td>
                      <span 
                        className={`badge ${g.paymentStatus === 'Paid' ? 'badge-paid' : 'badge-pending'}`} 
                        style={{ cursor: 'pointer' }}
                        onClick={() => togglePaymentStatus(g)}
                        title="Click to toggle status"
                      >
                        {g.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <div className="action-btns">
                        <button className="action-btn-icon view" onClick={() => openView(g.billNumber)} title="View Items">👁️</button>
                        <button className="action-btn-icon edit" onClick={() => openEdit(g)} title="Edit Bill">✏️</button>
                        <button className="action-btn-icon del" onClick={() => handleDeleteBill(g.billNumber, g)} title="Delete Bill">🗑️</button>
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
