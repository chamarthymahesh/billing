import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axiosInstance';
import Layout from '../components/Layout';
import './InvoiceDetail.css';

export default function InvoiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get(`/invoices/${id}`)
      .then(r => setInvoice(r.data))
      .catch(() => navigate('/invoices'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  if (loading) return <Layout><div className="loading-state">Loading invoice...</div></Layout>;
  if (!invoice) return <Layout><div>Invoice not found</div></Layout>;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Layout>
      <div className="page-header no-print">
        <div>
          <h1 className="page-title">Invoice Detail</h1>
          <p className="page-subtitle">View and print invoice {invoice.invoiceNumber}</p>
        </div>
        <div className="action-btns">
          <button className="btn-secondary" onClick={() => navigate('/invoices')}>Back</button>
          <button className="btn-primary" onClick={handlePrint}>🖨 Print / PDF</button>
        </div>
      </div>

      <div className={`invoice-container template-${invoice.companyId?.settings?.invoiceTemplate || 'Professional'}`}>
        {/* Invoice Header */}
        <div className="invoice-header">
          <div className="company-info">
            <h1 className="company-name">{invoice.companyId?.name}</h1>
            <p>{invoice.companyId?.address}</p>
            <p>GSTIN: {invoice.companyId?.gstin} | Phone: {invoice.companyId?.phone}</p>
            {invoice.dispatchAddress && (
              <div className="dispatch-info">
                <p><strong>Shipped From:</strong> {invoice.dispatchAddress} ({invoice.dispatchState})</p>
              </div>
            )}
            <p>Email: {invoice.companyId?.email}</p>
          </div>
          <div className="invoice-meta">
            <h2 className="invoice-type">{invoice.isGst ? 'TAX INVOICE' : 'INVOICE'}</h2>
            <div className="meta-row">
              <span className="meta-label">Invoice #:</span>
              <span className="meta-value">{invoice.invoiceNumber}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Date:</span>
              <span className="meta-value">{new Date(invoice.date).toLocaleDateString('en-IN')}</span>
            </div>
            {invoice.dueDate && (
              <div className="meta-row">
                <span className="meta-label">Due Date:</span>
                <span className="meta-value">{new Date(invoice.dueDate).toLocaleDateString('en-IN')}</span>
              </div>
            )}
            <div className={`status-tag status-${invoice.status}`}>
              {invoice.status.replace('_', ' ').toUpperCase()}
            </div>
          </div>
        </div>

        <hr className="divider" />

        {/* Billing & Shipping Section */}
        <div className="address-container">
          <div className="bill-to-section">
            <h3 className="section-title">Bill To:</h3>
            <div className="customer-info">
              <h4 className="customer-name">{invoice.customer?.name}</h4>
              <p>{invoice.customer?.address}</p>
              <p>Phone: {invoice.customer?.phone}</p>
              {invoice.isGst && invoice.customer?.gstin && (
                <p><strong>GSTIN: {invoice.customer?.gstin}</strong></p>
              )}
              <p>State: {invoice.customer?.state}</p>
            </div>
          </div>
          {(!invoice.customer?.sameAsBilling || invoice.customer?.shippingAddress !== invoice.customer?.address) && invoice.customer?.shippingAddress && (
            <div className="ship-to-section">
              <h3 className="section-title">Ship To:</h3>
              <div className="customer-info">
                <p>{invoice.customer?.shippingAddress}</p>
                <p><strong>Place of Supply: {invoice.customer?.placeOfSupply || invoice.customer?.state}</strong></p>
              </div>
            </div>
          )}
        </div>

        {/* Items Table */}
        <table className="invoice-table">
          <thead>
            <tr>
              <th>Description</th>
              {invoice.isGst && <th>HSN</th>}
              <th>Qty</th>
              <th>Rate</th>
              {invoice.isGst && <th>GST%</th>}
              <th className="text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, i) => (
              <tr key={i}>
                <td>
                  <div className="item-desc">{item.description}</div>
                </td>
                {invoice.isGst && <td>{item.hsnCode || '—'}</td>}
                <td>{item.quantity}</td>
                <td>₹{Number(item.rate).toFixed(2)}</td>
                {invoice.isGst && <td>{item.gstRate}%</td>}
                <td className="text-right">₹{(item.quantity * item.rate).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Summary Section */}
        <div className="invoice-summary-container">
          <div className="invoice-notes">
            <h4 className="notes-title">Notes & Terms</h4>
            <p>{invoice.notes || 'Thank you for your business!'}</p>
            
            {invoice.companyId?.bankDetails?.bankName && (
              <div className="bank-details-info" style={{ marginTop: 20 }}>
                <h4 className="notes-title">Bank Details (For Payment)</h4>
                <div className="bank-grid">
                  <p><span>Bank:</span> {invoice.companyId.bankDetails.bankName}</p>
                  <p><span>A/c No:</span> {invoice.companyId.bankDetails.accountNo}</p>
                  <p><span>IFSC:</span> {invoice.companyId.bankDetails.ifscCode}</p>
                  {invoice.companyId.bankDetails.branch && <p><span>Branch:</span> {invoice.companyId.bankDetails.branch}</p>}
                </div>
              </div>
            )}
          </div>
          <div className="summary-details">
            <div className="summary-row">
              <span>Subtotal:</span>
              <span>₹{invoice.subTotal.toFixed(2)}</span>
            </div>
            {invoice.isGst && (
              <>
                <div className="summary-row">
                  <span>CGST:</span>
                  <span>₹{(invoice.totalGst / 2).toFixed(2)}</span>
                </div>
                <div className="summary-row">
                  <span>SGST:</span>
                  <span>₹{(invoice.totalGst / 2).toFixed(2)}</span>
                </div>
                <div className="summary-row highlight">
                  <span>Total GST:</span>
                  <span>₹{invoice.totalGst.toFixed(2)}</span>
                </div>
              </>
            )}
            {invoice.transportCharges > 0 && (
              <div className="summary-row">
                <span>Transport:</span>
                <span>₹{invoice.transportCharges.toFixed(2)}</span>
              </div>
            )}
            {invoice.adjustment !== 0 && (
              <div className="summary-row">
                <span>Adjustment:</span>
                <span>₹{invoice.adjustment.toFixed(2)}</span>
              </div>
            )}
            <div className="summary-row grand-total">
              <span>Grand Total:</span>
              <span>₹{invoice.grandTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="invoice-footer">
          <div className="footer-sign">
            <div className="sign-line"></div>
            <p>Authorized Signatory</p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
