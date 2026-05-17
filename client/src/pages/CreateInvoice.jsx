import React, { useState, useEffect } from 'react';

import { useNavigate } from 'react-router-dom';
import API from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import './CreateInvoice.css';

const EMPTY_ITEM = { description: '', hsnCode: '', quantity: 1, rate: 0, gstRate: 18 };
const GST_RATES = [0, 5, 12, 18, 28];

export default function CreateInvoice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [isNewCustomer, setIsNewCustomer] = useState(true);

  const [form, setForm] = useState({
    isGst: true,
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    customer: { 
      name: '', address: '', phone: '', gstin: '', state: '', placeOfSupply: '',
      shippingAddress: '', sameAsBilling: true 
    },
    items: [{ ...EMPTY_ITEM }],
    transportCharges: 0,
    commission: 0,
    adjustment: 0,
    notes: '',
    dispatchAddress: '',
    dispatchState: '',
    sameAsCompany: true
  });

  useEffect(() => {
    Promise.all([
      API.get('/products'),
      API.get('/invoices'),
      API.get(`/companies/${user.companyId}`)
    ]).then(([prodRes, invRes, compRes]) => {
      setProducts(prodRes.data);
      // Extract unique customers
      const unique = [];
      const seen = new Set();
      invRes.data.forEach(inv => {
        if (inv.customer?.name && !seen.has(inv.customer.name.toLowerCase())) {
          seen.add(inv.customer.name.toLowerCase());
          unique.push(inv.customer);
        }
      });
      setCustomerSuggestions(unique);
      
      // Set default notes/terms from company settings
      if (compRes.data?.settings?.termsAndConditions) {
        setForm(f => ({ ...f, notes: compRes.data.settings.termsAndConditions }));
      }
    }).catch(() => {});
  }, [user.companyId]);

  const handleCustomerSelect = (val) => {
    if (val === 'NEW') {
      setIsNewCustomer(true);
      setForm(f => ({
        ...f,
        customer: {
          name: '', address: '', phone: '', gstin: '', state: '', placeOfSupply: '',
          shippingAddress: '', sameAsBilling: true 
        }
      }));
    } else {
      setIsNewCustomer(false);
      const match = customerSuggestions.find(c => c.name === val);
      if (match) {
        setForm(f => ({
          ...f,
          customer: { 
            ...match, 
            placeOfSupply: match.placeOfSupply || match.state,
            sameAsBilling: match.sameAsBilling ?? true 
          }
        }));
      }
    }
  };

  const handleCustomer = (field, val) => {
    let nextCustomer = { ...form.customer, [field]: val };

    if (field === 'state') {
      nextCustomer.placeOfSupply = val;
    }

    if (field === 'address' && nextCustomer.sameAsBilling) {
      nextCustomer.shippingAddress = val;
    }
    
    setForm(f => ({ ...f, customer: nextCustomer }));
  };

  const handleItem = (idx, field, val) => {
    const items = [...form.items];
    items[idx] = { ...items[idx], [field]: val };
    setForm(f => ({ ...f, items }));
  };

  const handleTotalChange = (idx, val) => {
    const items = [...form.items];
    const item = items[idx];
    const newTotal = Number(val) || 0;
    const qty = Number(item.quantity) || 1;
    const gstMultiplier = form.isGst ? (1 + Number(item.gstRate) / 100) : 1;
    
    // Calculate new rate (Total / (Qty * (1 + GST%)))
    const newRate = newTotal / (qty * gstMultiplier);
    
    // Save rate with high precision to ensure total recalculates accurately
    items[idx] = { ...item, rate: parseFloat(newRate.toFixed(4)) };
    setForm(f => ({ ...f, items }));
  };

  const addItem = () => setForm(f => ({ ...f, items: [...f.items, { ...EMPTY_ITEM }] }));
  const removeItem = (idx) => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const fillFromProduct = (idx, productId) => {
    const p = products.find(p => p._id === productId);
    if (p) {
      const items = [...form.items];
      items[idx] = {
        ...items[idx],
        description: p.name,
        rate: p.price,
        gstRate: p.gstRate,
        hsnCode: p.hsnCode || '',
        purchasePrice: p.purchasePrice || 0
      };
      setForm(f => ({ ...f, items }));
    }
  };

  // Calculations
  const calcItem = (item) => {
    const amount = Number(item.quantity) * Number(item.rate);
    const gst = form.isGst ? (amount * Number(item.gstRate)) / 100 : 0;
    return { amount, gst, total: amount + gst };
  };

  const subTotal = form.items.reduce((s, i) => s + calcItem(i).amount, 0);
  const totalGst = form.isGst ? form.items.reduce((s, i) => s + calcItem(i).gst, 0) : 0;
  const grandTotal =
    subTotal +
    totalGst +
    Number(form.transportCharges || 0) +
    Number(form.adjustment || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...form,
        companyId: user.companyId,
        subTotal,
        totalGst,
        grandTotal,
      };
      await API.post('/invoices', payload);
      navigate('/invoices');
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Create Invoice</h1>
          <p className="page-subtitle">Fill in the details below to generate a new invoice</p>
        </div>
        <div className="gst-toggle">
          <button
            id="toggle-gst"
            type="button"
            className={`toggle-btn ${form.isGst ? 'active' : ''}`}
            onClick={() => setForm(f => ({ ...f, isGst: true }))}
          >GST Invoice</button>
          <button
            id="toggle-nongst"
            type="button"
            className={`toggle-btn ${!form.isGst ? 'active' : ''}`}
            onClick={() => setForm(f => ({ ...f, isGst: false }))}
          >Non-GST Invoice</button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="invoice-form">
        {/* Invoice Meta */}
        <div className="glass-card form-section">
          <h2 className="section-title">Invoice Details</h2>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Invoice Date</label>
              <input type="date" className="input-field" value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))} required />
            </div>
            <div className="form-group">
              <label>Due Date (Optional)</label>
              <input type="date" className="input-field" value={form.dueDate}
                onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="glass-card form-section">
          <h2 className="section-title">Customer Details</h2>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Customer Name *</label>
              {customerSuggestions.length > 0 && (
                <select 
                  className="input-field" 
                  style={{ marginBottom: isNewCustomer ? '10px' : '0' }}
                  value={isNewCustomer ? 'NEW' : form.customer.name}
                  onChange={e => handleCustomerSelect(e.target.value)}
                >
                  <option value="" disabled>Select a customer...</option>
                  {customerSuggestions.map((c, i) => (
                    <option key={i} value={c.name}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                  ))}
                  <option value="NEW">➕ Add New Customer</option>
                </select>
              )}
              
              {(isNewCustomer || customerSuggestions.length === 0) && (
                <input 
                  className="input-field highlight-input" 
                  placeholder="Type new customer name..." 
                  required
                  value={form.customer.name} 
                  onChange={e => handleCustomer('name', e.target.value)} 
                />
              )}
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="input-field" placeholder="+91 XXXXXXXXXX"
                value={form.customer.phone} onChange={e => handleCustomer('phone', e.target.value)} />
            </div>
            <div className="form-group full-width">
              <label>Billing Address</label>
              <textarea className="input-field" placeholder="Full billing address" rows="2"
                value={form.customer.address} onChange={e => handleCustomer('address', e.target.value)} />
            </div>
            <div className="form-group full-width" style={{ marginTop: '10px' }}>
              <label className="checkbox-label">
                <input type="checkbox" checked={form.customer.sameAsBilling} 
                  onChange={e => {
                    const same = e.target.checked;
                    handleCustomer('sameAsBilling', same);
                    if (same) handleCustomer('shippingAddress', form.customer.address);
                  }} />
                <span>Shipping Address is same as Billing</span>
              </label>
            </div>
            {!form.customer.sameAsBilling && (
              <div className="form-group full-width">
                <label>Shipping Address / Delivery Location *</label>
                <textarea className="input-field highlight-input" placeholder="Enter delivery address" rows="2" required
                  value={form.customer.shippingAddress} onChange={e => handleCustomer('shippingAddress', e.target.value)} />
              </div>
            )}
            <div className="form-group">
              <label>Customer State (Billing)</label>
              <input className="input-field" placeholder="e.g. Maharashtra, Delhi"
                value={form.customer.state} onChange={e => handleCustomer('state', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Place of Supply (Delivery State) *</label>
              <input className="input-field highlight-input" placeholder="Determines IGST vs CGST/SGST" required
                value={form.customer.placeOfSupply} onChange={e => handleCustomer('placeOfSupply', e.target.value)} />
            </div>
            {form.isGst && (
              <div className="form-group">
                <label>Customer GSTIN</label>
                <input className="input-field" placeholder="22AAAAA0000A1Z5"
                  value={form.customer.gstin} onChange={e => handleCustomer('gstin', e.target.value)} />
              </div>
            )}
          </div>
        </div>

        {/* Dispatch Details */}
        <div className="glass-card form-section">
          <h2 className="section-title">Dispatch Details (Shipped From)</h2>
          <div className="form-group full-width" style={{ marginBottom: '10px' }}>
            <label className="checkbox-label">
              <input type="checkbox" checked={form.sameAsCompany} 
                onChange={e => setForm(f => ({ ...f, sameAsCompany: e.target.checked }))} />
              <span>Shipped from Company Registered Address</span>
            </label>
          </div>
          {!form.sameAsCompany && (
            <div className="form-grid-2">
              <div className="form-group full-width">
                <label>Dispatch Address / Warehouse *</label>
                <textarea className="input-field highlight-input" placeholder="Enter warehouse or dispatch site address" rows="2" required
                  value={form.dispatchAddress} onChange={e => setForm(f => ({ ...f, dispatchAddress: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Dispatch State *</label>
                <input className="input-field highlight-input" placeholder="e.g. Maharashtra" required
                  value={form.dispatchState} onChange={e => setForm(f => ({ ...f, dispatchState: e.target.value }))} />
              </div>
            </div>
          )}
        </div>
        <div className="glass-card form-section">
          <div className="items-header">
            <h2 className="section-title">Line Items</h2>
            <button type="button" id="add-item-btn" className="btn-primary btn-sm" onClick={addItem}>+ Add Item</button>
          </div>
          <div className="table-wrap">
            <table className="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Description</th>
                  {form.isGst && <th>HSN Code</th>}
                  <th>Qty</th>
                  <th>Rate (₹)</th>
                  {form.isGst && <th>GST %</th>}
                  <th>Amount</th>
                  {form.isGst && <th>GST Amt</th>}
                  <th>Total</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => {
                  const { amount, gst, total } = calcItem(item);
                  return (
                    <tr key={idx}>
                      <td>
                        <select className="input-field item-input sm"
                          onChange={e => fillFromProduct(idx, e.target.value)}>
                          <option value="">Select...</option>
                          {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                        </select>
                      </td>
                      <td>
                        <input className="input-field item-input" placeholder="Description"
                          value={item.description}
                          onChange={e => handleItem(idx, 'description', e.target.value)} required />
                      </td>
                      {form.isGst && (
                        <td>
                          <input className="input-field item-input sm" placeholder="HSN"
                            value={item.hsnCode}
                            onChange={e => handleItem(idx, 'hsnCode', e.target.value)} />
                        </td>
                      )}
                      <td>
                        <input type="number" className="input-field item-input sm" min="1"
                          value={item.quantity}
                          onChange={e => handleItem(idx, 'quantity', e.target.value)} />
                      </td>
                      <td>
                        <div className="rate-input-wrap">
                          <input type="number" className="input-field item-input sm" min="0"
                            value={item.rate}
                            onChange={e => handleItem(idx, 'rate', e.target.value)} />
                          {item.purchasePrice > 0 && (
                            <div className="purchase-hint">Purch: ₹{item.purchasePrice}</div>
                          )}
                        </div>
                      </td>
                      {form.isGst && (
                        <td>
                          <select className="input-field item-input sm" value={item.gstRate}
                            onChange={e => handleItem(idx, 'gstRate', e.target.value)}>
                            {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                          </select>
                        </td>
                      )}
                      <td className="calc-cell">₹{amount.toFixed(2)}</td>
                      {form.isGst && <td className="calc-cell gst-cell">₹{gst.toFixed(2)}</td>}
                      <td className="calc-cell total-cell">
                        <input 
                          type="number" 
                          step="any" 
                          className="input-field item-input sm highlight-input"
                          style={{ width: '80px', padding: '4px' }}
                          value={total ? Number(total.toFixed(2)) : ''}
                          onChange={e => handleTotalChange(idx, e.target.value)}
                        />
                      </td>
                      <td>
                        {form.items.length > 1 && (
                          <button type="button" className="remove-btn" onClick={() => removeItem(idx)}>✕</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charges & Summary */}
        <div className="form-bottom">
          <div className="glass-card charges-card">
            <h2 className="section-title">Additional Charges</h2>
            <div className="form-group">
              <label>Transport Charges (₹)</label>
              <input type="number" className="input-field" min="0" value={form.transportCharges}
                onChange={e => setForm(f => ({ ...f, transportCharges: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Commission (₹)</label>
              <input type="number" className="input-field" min="0" value={form.commission}
                onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Adjustment (₹) — round-off, discount etc.</label>
              <input type="number" className="input-field" value={form.adjustment}
                onChange={e => setForm(f => ({ ...f, adjustment: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Notes</label>
              <textarea className="input-field" rows="3" placeholder="Payment terms, delivery note..."
                value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
          </div>

          <div className="glass-card summary-card">
            <h2 className="section-title">Invoice Summary</h2>
            <div className="summary-rows">
              <div className="summary-row"><span>Subtotal</span><span>₹{subTotal.toFixed(2)}</span></div>
              {form.isGst && (
                <>
                  <div className="summary-row"><span>CGST</span><span>₹{(totalGst / 2).toFixed(2)}</span></div>
                  <div className="summary-row"><span>SGST</span><span>₹{(totalGst / 2).toFixed(2)}</span></div>
                  <div className="summary-row"><span>Total GST</span><span>₹{totalGst.toFixed(2)}</span></div>
                </>
              )}
              <div className="summary-row"><span>Transport</span><span>₹{Number(form.transportCharges || 0).toFixed(2)}</span></div>
              <div className="summary-row"><span>Adjustment</span><span>₹{Number(form.adjustment || 0).toFixed(2)}</span></div>
              <div className="summary-row grand"><span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span></div>
            </div>
            <button id="submit-invoice-btn" type="submit" className="btn-primary submit-btn" disabled={loading}>
              {loading ? 'Creating...' : '✅ Create Invoice'}
            </button>
          </div>
        </div>
      </form>
    </Layout>
  );
}
