import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export const generateBillingReportPDF = (filteredInvoices, stats, dateRange) => {
  const doc = new jsPDF('l', 'mm', 'a4');
  const timestamp = new Date().toLocaleString('en-IN');
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(99, 102, 241); // Indigo-600
  doc.text('Billing Software \u2013 Financial Report', 14, 15);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  const rangeStr = dateRange.from || dateRange.to 
    ? `Period: ${dateRange.from || 'Start'} to ${dateRange.to || 'Today'}`
    : 'Period: All Time';
  doc.text(`${rangeStr} | Generated: ${timestamp}`, 14, 22);

  // Summary Cards Section
  if (stats) {
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('Financial Summary', 14, 32);
    
    autoTable(doc, {
      startY: 35,
      body: [[
        `Total Revenue: \u20B9${stats.totalSales?.toLocaleString('en-IN')}`,
        `GST Collected: \u20B9${stats.totalGst?.toLocaleString('en-IN')}`,
        `Commission: \u20B9${stats.totalCommission?.toLocaleString('en-IN')}`,
        `Transport: \u20B9${stats.totalTransport?.toLocaleString('en-IN')}`,
        `Invoices: ${stats.count}`
      ]],
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: 2, fontStyle: 'bold' },
    });
  }

  // Main Transaction Table
  const tableHeaders = [['Invoice #', 'Date', 'Customer', 'Type', 'Subtotal', 'GST', 'Transport', 'Comm.', 'Total', 'Status']];
  const tableBody = filteredInvoices.map(inv => [
    inv.invoiceNumber,
    new Date(inv.date).toLocaleDateString('en-IN'),
    inv.customer?.name || '--',
    inv.isGst ? 'GST' : 'Non-GST',
    `\u20B9${inv.subTotal?.toLocaleString('en-IN')}`,
    `\u20B9${(inv.totalGst || 0).toLocaleString('en-IN')}`,
    `\u20B9${(inv.transportCharges || 0).toLocaleString('en-IN')}`,
    `\u20B9${(inv.commission || 0).toLocaleString('en-IN')}`,
    `\u20B9${inv.grandTotal?.toLocaleString('en-IN')}`,
    inv.status.toUpperCase()
  ]);

  autoTable(doc, {
    startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 45,
    head: tableHeaders,
    body: tableBody,
    theme: 'grid',
    headStyles: { fillColor: [99, 102, 241], fontSize: 9 },
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 20 },
      2: { cellWidth: 40 },
      3: { cellWidth: 15 },
      9: { halign: 'center' }
    }
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text('Confidential \u2013 Billing Management System', 14, doc.internal.pageSize.height - 10);
    doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 25, doc.internal.pageSize.height - 10);
  }

  // Download
  const fileName = `Billing_Report_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};
