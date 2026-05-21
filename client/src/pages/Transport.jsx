import React, { useState, useEffect } from 'react';
import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import './Transport.css';

export default function Transport() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [invoices, setInvoices] = useState([]);
  const [formData, setFormData] = useState({
    vehicleNumber: '',
    date: new Date().toISOString().split('T')[0],
    driverName: '',
    type: 'Fuel',
    description: '',
    amount: '',
    odometerReading: '',
    liters: '',
    invoiceId: ''
  });

  useEffect(() => {
    loadRecords();
    loadInvoices();
  }, []);

  const loadRecords = async () => {
    try {
      const r = await API.get('/transport');
      setRecords(r.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadInvoices = async () => {
    try {
      const r = await API.get('/invoices');
      setInvoices(r.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/transport', formData);
      setShowModal(false);
      setFormData({
        vehicleNumber: '',
        date: new Date().toISOString().split('T')[0],
        driverName: '',
        type: 'Fuel',
        description: '',
        amount: '',
        odometerReading: '',
        liters: '',
        invoiceId: ''
      });
      loadRecords();
    } catch (err) {
      alert('Error saving record');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    try {
      await API.delete(`/transport/${id}`);
      loadRecords();
    } catch (err) {
      alert('Error deleting record');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Transport Management</h1>
          <p className="page-subtitle">Track fuel, maintenance, and vehicle expenses</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Transport Record</button>
      </div>

      <div className="glass-card">
        {loading ? <div className="loading-state">Loading...</div> : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Vehicle #</th>
                  <th>Type</th>
                  <th>Driver</th>
                  <th>Details</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {records.length === 0 ? <tr><td colSpan="7" className="empty-row">No records found</td></tr> :
                  records.map(r => (
                    <tr key={r._id}>
                      <td>{new Date(r.date).toLocaleDateString('en-IN')}</td>
                      <td className="vehicle-cell">🚗 {r.vehicleNumber}</td>
                      <td><span className={`type-badge t-${r.type.toLowerCase().replace('/', '')}`}>{r.type}</span></td>
                      <td>{r.driverName}</td>
                      <td>
                        <div className="desc-cell">
                          {r.description}
                          {r.liters && <div className="sub-text">{r.liters} Liters</div>}
                          {r.invoiceId && <div className="sub-text">Delivery: {r.invoiceId.invoiceNumber}</div>}
                        </div>
                      </td>
                      <td className="amount-cell">₹{r.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>
                        <button className="action-btn delete" onClick={() => handleDelete(r._id)}>🗑️</button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h2>Add Transport Record</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="transport-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Vehicle Number</label>
                  <input className="input-field" placeholder="MH-01-AB-1234" required
                    value={formData.vehicleNumber} onChange={e => setFormData({...formData, vehicleNumber: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Date</label>
                  <input type="date" className="input-field" required
                    value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select className="input-field" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="Fuel">⛽ Fuel Filling</option>
                    <option value="Maintenance">🛠️ Maintenance / Repair</option>
                    <option value="Delivery">🚚 Delivery Trip</option>
                    <option value="Toll/Expense">🛣️ Toll / Daily Expense</option>
                    <option value="Other">📝 Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Amount (₹)</label>
                  <input type="number" className="input-field" required
                    value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Driver Name</label>
                  <input className="input-field" value={formData.driverName} onChange={e => setFormData({...formData, driverName: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Odometer Reading</label>
                  <input type="number" className="input-field" value={formData.odometerReading} onChange={e => setFormData({...formData, odometerReading: e.target.value})} />
                </div>
                {formData.type === 'Fuel' && (
                  <div className="form-group">
                    <label>Liters</label>
                    <input type="number" step="0.01" className="input-field" value={formData.liters} onChange={e => setFormData({...formData, liters: e.target.value})} />
                  </div>
                )}
                {formData.type === 'Delivery' && (
                  <div className="form-group">
                    <label>Link to Invoice</label>
                    <select className="input-field" value={formData.invoiceId} onChange={e => setFormData({...formData, invoiceId: e.target.value})}>
                      <option value="">Select Invoice...</option>
                      {invoices.map(inv => <option key={inv._id} value={inv._id}>{inv.invoiceNumber} - {inv.customer?.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="form-group full-width">
                  <label>Description / Notes</label>
                  <textarea className="input-field" rows="2" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">💾 Save Record</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
