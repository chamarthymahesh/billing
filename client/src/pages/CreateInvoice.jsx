import React, { useState, useEffect } from 'react';

import { useNavigate, useParams } from 'react-router-dom';
import API from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';
import './CreateInvoice.css';

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

const EMPTY_ITEM = { productId: '', description: '', hsnCode: '', quantity: 1, rate: 0, gstRate: 18 };
const GST_RATES = [0, 5, 12, 18, 28];
const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry"
];

export default function CreateInvoice() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [myPurchasedProductIds, setMyPurchasedProductIds] = useState(new Set());
  const [customerSuggestions, setCustomerSuggestions] = useState([]);
  const [isNewCustomer, setIsNewCustomer] = useState(true);
  const [useGlobalCustomers, setUseGlobalCustomers] = useState(false);
  const [localCustomers, setLocalCustomers] = useState([]);
  const [globalCustomers, setGlobalCustomers] = useState([]);
  // Supplier states
  const [localSuppliers, setLocalSuppliers] = useState([]);
  const [supplierSuggestions, setSupplierSuggestions] = useState([]);
  const [companies, setCompanies] = useState([]); // Array of registered companies
  const [currentCompany, setCurrentCompany] = useState(null);
  // For managers: selected company to create invoice for
  const [selectedCompanyId, setSelectedCompanyId] = useState('');

  const [form, setForm] = useState({
    isGst: true,
    date: new Date().toISOString().split('T')[0],
    dueDate: '',
    gemContractNumber: '',
    customer: { 
      name: '', address: '', phone: '', gstin: '', state: '', placeOfSupply: '',
      shippingAddress: '', sameAsBilling: true 
    },
    supplier: { name: '', address: '', phone: '' },
    items: [{ ...EMPTY_ITEM }],
    transportCharges: 0,
    transportStatus: 'unpaid',
    commissionType: 'manual',
    commissionPercentage: 0,
    commission: 0,
    adjustment: 0,
    notes: '',
    dispatchAddress: '',
    dispatchState: '',
    sameAsCompany: true,
    materialDeliveryStatus: 'Pending'
  });

  const effectiveCompanyId = user.role === 'manager' ? selectedCompanyId : user.companyId;

  useEffect(() => {
    // Fetch customers and suppliers data
    const companyFetch = effectiveCompanyId
      ? API.get(`/companies/${effectiveCompanyId}`).catch(() => ({ data: null }))
      : Promise.resolve({ data: null });

    Promise.all([
      API.get('/products'),
      API.get('/invoices'),
      companyFetch,
      API.get('/companies/list'),
      API.get('/purchases/my-products').catch(() => ({ data: [] }))
    ]).then(([prodRes, invRes, compRes, compListRes, myProdsRes]) => {
      // Deduplicate and normalize products
      const rawProducts = prodRes.data || [];
      const myProducts = rawProducts.filter(p => p.companyId === effectiveCompanyId);
      const otherProducts = rawProducts.filter(p => p.companyId !== effectiveCompanyId);
      
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
      
      setMyPurchasedProductIds(new Set(myProdsRes.data));
      console.log('My purchased product IDs set:', Array.from(new Set(myProdsRes.data)));
      setCurrentCompany(compRes.data);
      const allCompanies = compListRes.data || [];
      setCompanies(allCompanies);
      // Build customer map
      const customerMap = new Map();
      const sortedInvoices = [...invRes.data].sort((a, b) => new Date(b.date) - new Date(a.date));
      sortedInvoices.forEach(inv => {
        if (inv.customer?.name) {
          const nameLower = inv.customer.name.toLowerCase().trim();
          if (!customerMap.has(nameLower)) {
            customerMap.set(nameLower, { ...inv.customer });
          } else {
            const existing = customerMap.get(nameLower);
            ['state', 'address', 'phone', 'gstin', 'placeOfSupply', 'shippingAddress']
              .forEach(field => {
                if (!existing[field] && inv.customer[field]) {
                  existing[field] = inv.customer[field];
                }
              });
          }
        }
      });
      const localList = Array.from(customerMap.values());
      setLocalCustomers(localList);
      setCustomerSuggestions(localList);
      // Suppliers - load from registered companies instead of local invoices
      setLocalSuppliers(allCompanies);
      setSupplierSuggestions(allCompanies);
      setForm(f => {
        const nextForm = { ...f };
        if (compRes.data?.settings?.termsAndConditions) {
          nextForm.notes = compRes.data.settings.termsAndConditions;
        }
        if (!id && compRes.data) {
          nextForm.supplier = {
            name: compRes.data.name || '',
            address: compRes.data.address || '',
            phone: compRes.data.phone || ''
          };
        }
        return nextForm;
      });
    }).catch(() => {});
  }, [effectiveCompanyId, id]);

  useEffect(() => {
    if (id) {
      API.get(`/invoices/${id}`).then(res => {
        const inv = res.data;
        setForm({
          isGst: inv.isGst,
          date: inv.date ? new Date(inv.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          dueDate: inv.dueDate ? new Date(inv.dueDate).toISOString().split('T')[0] : '',
          gemContractNumber: inv.gemContractNumber || '',
          customer: inv.customer || { 
            name: '', address: '', phone: '', gstin: '', state: '', placeOfSupply: '',
            shippingAddress: '', sameAsBilling: true 
          },
          supplier: inv.supplier || { name: '', address: '', phone: '' },
          items: inv.items || [{ ...EMPTY_ITEM }],
          transportCharges: inv.transportCharges || 0,
          transportStatus: inv.transportStatus || 'unpaid',
          commissionType: inv.commissionType || 'manual',
          commissionPercentage: inv.commissionPercentage || 0,
          commission: inv.commission || 0,
          adjustment: inv.adjustment || 0,
          notes: inv.notes || '',
          dispatchAddress: inv.dispatchAddress || '',
          dispatchState: inv.dispatchState || '',
          sameAsCompany: inv.sameAsCompany !== undefined ? inv.sameAsCompany : true,
          invoiceNumber: inv.invoiceNumber,
          materialDeliveryStatus: inv.materialDeliveryStatus || 'Pending'
        });
        setIsNewCustomer(false);
      }).catch(console.error);
    }
  }, [id]);

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

  const handleSupplierSelect = (val) => {
    if (val === 'NEW') {
      setForm(f => ({ ...f, supplier: { name: '', address: '', phone: '' } }));
    } else {
      const match = supplierSuggestions.find(s => s.name === val);
      if (match) {
        setForm(f => ({ ...f, supplier: { name: match.name, address: match.address || '', phone: match.phone || '' } }));
      }
    }
  };

  const toggleGlobalCustomers = async (checked) => {
    setUseGlobalCustomers(checked);
    if (checked) {
      if (globalCustomers.length === 0) {
        try {
          const res = await API.get('/invoices/global-customers');
          setGlobalCustomers(res.data);
          setCustomerSuggestions(res.data);
        } catch (err) {
          console.error("Failed to fetch global customers:", err);
          alert("Error loading global customers.");
          setUseGlobalCustomers(false);
        }
      } else {
        setCustomerSuggestions(globalCustomers);
      }
    } else {
      setCustomerSuggestions(localCustomers);
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
        productId: p._id,
        description: p.name,
        rate: p.price || p.purchasePrice || 0,
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

  const sellerState = currentCompany?.state || '';
  const deliveryState = form.customer?.placeOfSupply || form.customer?.state || '';
  const isInterState = sellerState && deliveryState && sellerState.trim().toLowerCase() !== deliveryState.trim().toLowerCase();

  const subTotal = form.items.reduce((s, i) => s + calcItem(i).amount, 0);
  const totalGst = form.isGst ? form.items.reduce((s, i) => s + calcItem(i).gst, 0) : 0;
  const calculatedCommission = form.commissionType === 'percentage'
    ? (subTotal * (Number(form.commissionPercentage) || 0)) / 100
    : (Number(form.commission) || 0);

  const grandTotal =
    subTotal +
    totalGst +
    Number(form.adjustment || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user.role === 'manager' && !selectedCompanyId) {
      alert('Please select a target company first.');
      setLoading(false);
      return;
    }
    // Ensure supplier name is provided
    if (!form.supplier?.name) {
      alert('Supplier Name is required.');
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const payload = {
        ...form,
        commission: calculatedCommission,
        companyId: effectiveCompanyId,
        subTotal,
        totalGst,
        grandTotal,
      };
      if (id) {
        await API.put(`/invoices/${id}`, payload);
      } else {
        await API.post('/invoices', payload);
      }
      navigate('/invoices');
    } catch (err) {
      const msg = err.response?.data?.message || '';
      if (err.response?.status === 400 && msg.includes('match purchased products')) {
        alert('⚠️ ACTION REQUIRED ⚠️\n\nYou are trying to bill products that you have NOT purchased yet (or you do not have enough stock purchased).\n\nPlease go to "Purchases" and create a purchase record for these products first!');
      } else {
        alert(msg || (id ? 'Error updating invoice' : 'Error creating invoice'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">{id ? 'Edit Invoice' : 'Create Invoice'}</h1>
          <p className="page-subtitle">{id ? `Updating invoice ${form.invoiceNumber || ''}` : 'Fill in the details below to generate a new invoice'}</p>
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

      {/* Manager: Company Selector */}
      {user?.role === 'manager' && (
        <div className="glass-card form-section" style={{ marginBottom: '20px', padding: '16px 20px' }}>
          <div className="form-group" style={{ maxWidth: '400px' }}>
            <label style={{ fontWeight: '600', color: '#f59e0b' }}>⚠️ Target Company *</label>
            <select
              className="input-field highlight-input"
              required
              value={selectedCompanyId}
              onChange={e => setSelectedCompanyId(e.target.value)}
            >
              <option value="">-- Select Company to Invoice For --</option>
              {companies.map(c => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      )}

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
              <label>GeM Contract Number (Optional)</label>
              <input className="input-field" placeholder="e.g., GEMC-5116877..." value={form.gemContractNumber}
                onChange={e => setForm(f => ({ ...f, gemContractNumber: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Material Delivery Status *</label>
              <select 
                className="input-field highlight-input" 
                value={form.materialDeliveryStatus}
                onChange={e => setForm(f => ({ ...f, materialDeliveryStatus: e.target.value }))} 
                required
              >
                <option value="Pending">⏳ Pending</option>
                <option value="Delivered">✅ Delivered</option>
              </select>
            </div>
          </div>
        </div>

        {/* Customer Details */}
        <div className="glass-card form-section">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}>Customer Details</h2>
            <label className="checkbox-label" style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', background: 'rgba(99, 102, 241, 0.1)', padding: '6px 12px', borderRadius: '8px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <input 
                type="checkbox" 
                checked={useGlobalCustomers} 
                onChange={e => toggleGlobalCustomers(e.target.checked)} 
                style={{ width: '16px', height: '16px', marginRight: '8px', cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary)' }}>
                🌐 Load Global Customers (All Companies)
              </span>
            </label>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label>Customer Name *</label>
                <CreatableSelect
                  styles={customSelectStyles}
                  value={form.customer.name ? { label: form.customer.name, value: form.customer.name } : null}
                  onChange={opt => {
                    if (opt) {
                      if (opt.__isNew__) {
                        handleCustomer('name', opt.value);
                      } else {
                        handleCustomerSelect(opt.value);
                      }
                    } else {
                      handleCustomer('name', '');
                    }
                  }}
                  options={customerSuggestions.map(c => ({ value: c.name, label: `${c.name} ${c.phone ? `(${c.phone})` : ''}` }))}
                  placeholder="Search or select a customer..."
                  isClearable
                  formatCreateLabel={(inputValue) => `➕ Add New Customer: "${inputValue}"`}
                />
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
              <label>Customer State (Billing) *</label>
              <select 
                className="input-field highlight-input" 
                required
                value={form.customer.state} 
                onChange={e => handleCustomer('state', e.target.value)}
              >
                <option value="">-- Select State --</option>
                {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Place of Supply (Delivery State) *</label>
              <select 
                className="input-field highlight-input" 
                required
                value={form.customer.placeOfSupply} 
                onChange={e => handleCustomer('placeOfSupply', e.target.value)}
              >
                <option value="">-- Select State --</option>
                {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
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

        {/* Supplier Details */}
        <div className="glass-card form-section">
          <h2 className="section-title">Supplier Details</h2>

          <div className="form-grid-2">
            <div className="form-group">
              <label>Supplier Name *</label>
              {companies.length > 0 ? (
                <Select
                  styles={customSelectStyles}
                  required
                  value={companies.filter(c => c.name === form.supplier?.name).map(c => ({ value: c.name, label: `${c.name} ${c.phone ? `(${c.phone})` : ''}` }))[0] || (form.supplier?.name ? { label: form.supplier.name, value: form.supplier.name } : null)}
                  onChange={opt => handleSupplierSelect(opt ? opt.value : '')}
                  options={companies.map(c => ({ value: c.name, label: `${c.name} ${c.phone ? `(${c.phone})` : ''}` }))}
                  placeholder="Select a supplier..."
                  isClearable
                />
              ) : (
                <div className="empty-row">No registered suppliers available.</div>
              )}
            </div>
            <div className="form-group">
              <label>Phone</label>
              <input className="input-field" placeholder="+91 XXXXXXXXXX" value={form.supplier?.phone || ''} onChange={e => setForm(f => ({ ...f, supplier: { ...f.supplier, phone: e.target.value } }))} />
            </div>
            <div className="form-group full-width">
              <label>Address</label>
              <textarea className="input-field" rows="2" placeholder="Full address" value={form.supplier?.address || ''} onChange={e => setForm(f => ({ ...f, supplier: { ...f.supplier, address: e.target.value } }))} />
            </div>
          </div>
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
                  <th style={{ minWidth: '300px' }}>Product</th>
                  <th style={{ minWidth: '150px' }}>Description</th>
                  {form.isGst && <th style={{ minWidth: '80px' }}>HSN Code</th>}
                  <th style={{ minWidth: '60px' }}>Qty</th>
                  <th style={{ minWidth: '100px' }}>Rate (₹)</th>
                  {form.isGst && <th style={{ minWidth: '70px' }}>GST %</th>}
                  <th style={{ minWidth: '90px' }}>Amount</th>
                  {form.isGst && <th style={{ minWidth: '80px' }}>GST Amt</th>}
                  <th style={{ minWidth: '110px' }}>Total</th>
                  <th style={{ minWidth: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, idx) => {
                  const { amount, gst, total } = calcItem(item);
                  return (
                    <tr key={idx}>
                      <td>
                        <Select
                          styles={customSelectStyles}
                          required
                          menuPortalTarget={document.body}
                          menuPosition="fixed"
                          value={products.filter(p => p._id === item.productId).map(p => {
                            const isTransfer = (p.companyId && p.companyId !== user.companyId) || !myPurchasedProductIds.has(p._id.toString()) || (p.stock != null && p.stock <= 0);
                            return { value: p._id, label: isTransfer ? `${p.name} 🌐 (Auto-Transfer)` : p.name };
                          })[0] || null}
                          onChange={opt => fillFromProduct(idx, opt ? opt.value : '')}
                          options={products.map(p => {
                            const isTransfer = (p.companyId && p.companyId !== user.companyId) || !myPurchasedProductIds.has(p._id.toString()) || (p.stock != null && p.stock <= 0);
                            return { value: p._id, label: isTransfer ? `${p.name} 🌐 (Auto-Transfer)` : p.name };
                          })}
                          placeholder="Select..."
                          isClearable
                        />
                      </td>
                      <td>
                        <input className="input-field item-input" placeholder="Description"
                          value={item.description}
                          onChange={e => handleItem(idx, 'description', e.target.value.toUpperCase())} required />
                      </td>
                      {form.isGst && (
                        <td>
                          <input className="input-field item-input sm" placeholder="HSN"
                            value={item.hsnCode}
                            onChange={e => handleItem(idx, 'hsnCode', e.target.value)} />
                        </td>
                      )}
                      <td>
                        <input type="number" step="any" className="input-field item-input sm" min="1"
                          value={item.quantity}
                          onChange={e => handleItem(idx, 'quantity', e.target.value)} />
                      </td>
                      <td>
                        <div className="rate-input-wrap">
                          <input type="number" step="any" className="input-field item-input sm" min="0"
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', gridColumn: '1 / -1', marginBottom: '16px' }}>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px' }}>Transport Charges (₹)</label>
                <input type="number" step="any" className="input-field" min="0" value={form.transportCharges}
                  onChange={e => setForm(f => ({ ...f, transportCharges: e.target.value }))} />
              </div>
              <div className="form-group">
                <label style={{ display: 'block', marginBottom: '8px' }}>Transport Payment Status</label>
                <select className="input-field" value={form.transportStatus || 'unpaid'}
                  onChange={e => setForm(f => ({ ...f, transportStatus: e.target.value }))}>
                  <option value="unpaid">⏳ Unpaid / Pending</option>
                  <option value="paid">✅ Paid</option>
                </select>
              </div>
            </div>
            
            <div className="form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Commission Type</label>
              <div style={{ display: 'flex', gap: '10px', marginBottom: '8px' }}>
                <label className="checkbox-label" style={{ display: 'inline-flex', alignItems: 'center' }}>
                  <input type="radio" name="commissionType" checked={form.commissionType === 'manual'}
                    onChange={() => setForm(f => ({ ...f, commissionType: 'manual' }))} />
                  <span style={{ marginLeft: 5 }}>Manual (₹)</span>
                </label>
                <label className="checkbox-label" style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 10 }}>
                  <input type="radio" name="commissionType" checked={form.commissionType === 'percentage'}
                    onChange={() => setForm(f => ({ ...f, commissionType: 'percentage' }))} />
                  <span style={{ marginLeft: 5 }}>Percentage (%)</span>
                </label>
              </div>
            </div>

            {form.commissionType === 'manual' ? (
              <div className="form-group">
                <label>Commission Amount (₹)</label>
                <input type="number" step="any" className="input-field highlight-input" min="0" value={form.commission}
                  onChange={e => setForm(f => ({ ...f, commission: e.target.value }))} />
              </div>
            ) : (
              <div className="form-group">
                <label>Commission Percentage (%)</label>
                <input type="number" step="any" className="input-field highlight-input" min="0" max="100" value={form.commissionPercentage}
                  onChange={e => setForm(f => ({ ...f, commissionPercentage: e.target.value }))} />
                <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '4px', fontWeight: 'bold' }}>
                  Calculated: ₹{((subTotal * (Number(form.commissionPercentage) || 0)) / 100).toFixed(2)}
                </div>
              </div>
            )}
            
            <div className="form-group">
              <label>Adjustment (₹) — round-off, discount etc.</label>
              <input type="number" step="any" className="input-field" value={form.adjustment}
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
                  {isInterState ? (
                    <div className="summary-row"><span>IGST</span><span>₹{totalGst.toFixed(2)}</span></div>
                  ) : (
                    <>
                      <div className="summary-row"><span>CGST</span><span>₹{(totalGst / 2).toFixed(2)}</span></div>
                      <div className="summary-row"><span>SGST</span><span>₹{(totalGst / 2).toFixed(2)}</span></div>
                    </>
                  )}
                  <div className="summary-row"><span>Total GST</span><span>₹{totalGst.toFixed(2)}</span></div>
                </>
              )}

              {Number(form.adjustment) !== 0 && (
                <div className="summary-row"><span>Adjustment</span><span>₹{Number(form.adjustment).toFixed(2)}</span></div>
              )}
              <div className="summary-row grand"><span>Grand Total</span><span>₹{grandTotal.toFixed(2)}</span></div>
            </div>
            <button id="submit-invoice-btn" type="submit" className="btn-primary submit-btn" disabled={loading}>
              {loading ? (id ? 'Saving...' : 'Creating...') : id ? '💾 Save Changes' : '✅ Create Invoice'}
            </button>
          </div>
        </div>
      </form>
    </Layout>
  );
}
