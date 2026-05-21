import React, { useState, useEffect } from 'react';
import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import './Employees.css';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);

  const [empForm, setEmpForm] = useState({ name: '', designation: '', phone: '', email: '', salaryAmount: '' });
  const [payForm, setPayForm] = useState({ employeeId: '', month: '', amountPaid: '', paymentMethod: 'Bank Transfer', notes: '' });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'list') {
        const { data } = await API.get('/employees');
        setEmployees(data);
      } else {
        const { data } = await API.get('/employees/salary');
        setHistory(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEmpSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/employees', empForm);
      setShowEmpModal(false);
      setEmpForm({ name: '', designation: '', phone: '', email: '', salaryAmount: '' });
      fetchData();
    } catch (err) { alert('Error saving employee'); }
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/employees/salary', payForm);
      setShowPayModal(false);
      setPayForm({ employeeId: '', month: '', amountPaid: '', paymentMethod: 'Bank Transfer', notes: '' });
      fetchData();
    } catch (err) { alert('Error saving payment'); }
  };

  const openPayModal = (emp) => {
    setPayForm({
      employeeId: emp._id,
      amountPaid: emp.salaryAmount,
      month: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      paymentMethod: 'Bank Transfer',
      notes: ''
    });
    setShowPayModal(true);
  };

  return (
    <Layout>
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff & Salary Management</h1>
          <p className="page-subtitle">Manage employee records and monthly payroll</p>
        </div>
        <div className="header-actions">
          <button className="btn-primary" onClick={() => setShowEmpModal(true)}>+ Add New Staff</button>
        </div>
      </div>

      <div className="tab-container">
        <button className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`} onClick={() => setActiveTab('list')}>👥 Staff List</button>
        <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>💰 Salary History</button>
      </div>

      <div className="glass-card">
        {loading ? <div className="loading-state">Loading data...</div> : (
          <div className="table-wrap">
            {activeTab === 'list' ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Employee Name</th>
                    <th>Designation</th>
                    <th>Contact</th>
                    <th>Salary (Monthly)</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.length === 0 ? <tr><td colSpan="6" className="empty-row">No employees found</td></tr> :
                    employees.map(emp => (
                      <tr key={emp._id}>
                        <td>
                          <div className="emp-name-cell">
                            <div className="emp-avatar">{emp.name.charAt(0)}</div>
                            <div>{emp.name}</div>
                          </div>
                        </td>
                        <td>{emp.designation}</td>
                        <td>{emp.phone}<br/><small>{emp.email}</small></td>
                        <td className="amount-cell">₹{emp.salaryAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td><span className={`status-badge ${emp.isActive ? 'active' : 'inactive'}`}>{emp.isActive ? 'Active' : 'Inactive'}</span></td>
                        <td>
                          <button className="btn-pay" onClick={() => openPayModal(emp)}>💳 Pay Salary</button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Payment Date</th>
                    <th>Employee</th>
                    <th>For Month</th>
                    <th>Amount Paid</th>
                    <th>Method</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {history.length === 0 ? <tr><td colSpan="6" className="empty-row">No payment history found</td></tr> :
                    history.map(rec => (
                      <tr key={rec._id}>
                        <td>{new Date(rec.paymentDate).toLocaleDateString('en-IN')}</td>
                        <td>
                          <div className="emp-info">
                            <strong>{rec.employeeId?.name}</strong>
                            <div>{rec.employeeId?.designation}</div>
                          </div>
                        </td>
                        <td><span className="month-badge">{rec.month}</span></td>
                        <td className="amount-cell positive">₹{rec.amountPaid.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>{rec.paymentMethod}</td>
                        <td>{rec.notes}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Add Employee Modal */}
      {showEmpModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card">
            <div className="modal-header">
              <h2>Add New Staff Member</h2>
              <button className="close-btn" onClick={() => setShowEmpModal(false)}>✕</button>
            </div>
            <form onSubmit={handleEmpSubmit} className="modal-form">
              <div className="form-grid-2">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input className="input-field" required value={empForm.name} onChange={e => setEmpForm({...empForm, name: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Designation</label>
                  <input className="input-field" placeholder="e.g. Sales Executive" value={empForm.designation} onChange={e => setEmpForm({...empForm, designation: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Monthly Salary (₹) *</label>
                  <input type="number" className="input-field" required value={empForm.salaryAmount} onChange={e => setEmpForm({...empForm, salaryAmount: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Phone Number</label>
                  <input className="input-field" value={empForm.phone} onChange={e => setEmpForm({...empForm, phone: e.target.value})} />
                </div>
                <div className="form-group full-width">
                  <label>Email Address</label>
                  <input type="email" className="input-field" value={empForm.email} onChange={e => setEmpForm({...empForm, email: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowEmpModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">💾 Save Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Salary Modal */}
      {showPayModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-card small-modal">
            <div className="modal-header">
              <h2>Record Salary Payment</h2>
              <button className="close-btn" onClick={() => setShowPayModal(false)}>✕</button>
            </div>
            <form onSubmit={handlePaySubmit} className="modal-form">
              <div className="form-group">
                <label>Salary for Month</label>
                <input className="input-field" placeholder="e.g. May 2026" required value={payForm.month} onChange={e => setPayForm({...payForm, month: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Amount to Pay (₹)</label>
                <input type="number" className="input-field" required value={payForm.amountPaid} onChange={e => setPayForm({...payForm, amountPaid: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Payment Method</label>
                <select className="input-field" value={payForm.paymentMethod} onChange={e => setPayForm({...payForm, paymentMethod: e.target.value})}>
                  <option value="Bank Transfer">🏦 Bank Transfer</option>
                  <option value="Cash">💵 Cash</option>
                  <option value="Cheque">🎫 Cheque</option>
                </select>
              </div>
              <div className="form-group">
                <label>Notes</label>
                <textarea className="input-field" rows="2" value={payForm.notes} onChange={e => setPayForm({...payForm, notes: e.target.value})} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">✅ Confirm Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
