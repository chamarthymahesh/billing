// Recalculate Invoices Script
// This script iterates over all invoices and updates grandTotal and totalProfit
// to include transportCharges and commission deductions, ensuring consistency across companies.

const mongoose = require('mongoose');
require('dotenv').config();

const Invoice = require('../models/Invoice');
const Company = require('../models/Company');
const Purchase = require('../models/Purchase');

// Helper to compute totals for a given invoice
function computeTotals(invoice) {
  let subTotal = 0;
  let totalGst = 0;
  let totalProfit = 0;
  invoice.items.forEach(item => {
    const amount = item.amount || (item.quantity * item.rate);
    subTotal += amount;
    const itemGst = (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
    totalGst += itemGst;
    const itemProfit = typeof item.profit === 'number'
      ? item.profit
      : ((item.rate - (item.purchasePrice || 0)) * item.quantity);
    totalProfit += itemProfit;
  });
  // Apply transport and commission deductions
  totalProfit = totalProfit - (Number(invoice.transportCharges) || 0) - (Number(invoice.commission) || 0);
  // Grand total includes subTotal, GST, adjustment and transport charges
  const adjustment = Number(invoice.adjustment) || 0;
  const transport = Number(invoice.transportCharges) || 0;
  const grandTotal = subTotal + totalGst + adjustment + transport;
  return { subTotal, totalGst, grandTotal, totalProfit };
}

async function recalcAllInvoices() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/billing', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const invoices = await Invoice.find({});
    console.log(`Found ${invoices.length} invoices`);

    for (const inv of invoices) {
      const { subTotal, totalGst, grandTotal, totalProfit } = computeTotals(inv);
      const updates = {};
      if (inv.subTotal !== subTotal) updates.subTotal = subTotal;
      if (inv.totalGst !== totalGst) updates.totalGst = totalGst;
      if (inv.grandTotal !== grandTotal) updates.grandTotal = grandTotal;
      if (inv.totalProfit !== totalProfit) updates.totalProfit = totalProfit;
      if (Object.keys(updates).length > 0) {
        await Invoice.findByIdAndUpdate(inv._id, updates);
        console.log(`Updated invoice ${inv.invoiceNumber}`);
      }
    }

    console.log('Recalculation complete');
    process.exit(0);
  } catch (err) {
    console.error('Error during recalculation:', err);
    process.exit(1);
  }
}

recalcAllInvoices();
