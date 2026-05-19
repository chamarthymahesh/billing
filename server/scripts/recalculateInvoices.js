// Recalculate Invoices Script
// This script iterates over all invoices and updates grandTotal and totalProfit
// to include transportCharges and commission deductions, ensuring consistency across companies.

const mongoose = require('mongoose');
require('dotenv').config();

const Invoice = require('../models/Invoice');
const Company = require('../models/Company');
const Purchase = require('../models/Purchase');

// Helper to calculate net profit (same as controller)
const calculateNetInvoiceProfit = (inv, purchases) => {
  const itemProfitsSum = inv.items.reduce((sum, item) => {
    const matchedPurchase = purchases.find(p =>
      p.productId?.toString() === item.productId?.toString()
    );
    let purchaseBase = 0;
    let purchaseGst = 0;
    if (matchedPurchase && matchedPurchase.quantity > 0) {
      const unitBase = matchedPurchase.subTotal / matchedPurchase.quantity;
      const unitGst = (matchedPurchase.totalGst || 0) / matchedPurchase.quantity;
      const otherCharges = (matchedPurchase.packagingCharges || 0) +
        (matchedPurchase.transportCharges || 0) +
        (matchedPurchase.miscCharges || 0);
      const unitOther = otherCharges / matchedPurchase.quantity;
      purchaseBase = (unitBase + unitOther) * item.quantity;
      purchaseGst = unitGst * item.quantity;
    } else {
      purchaseBase = (item.purchasePrice || 0) * item.quantity;
      purchaseGst = item.isGst ? (purchaseBase * (item.gstRate || 0)) / 100 : 0;
    }
    const sellingBase = item.amount || (item.quantity * item.rate);
    const sellingGst = item.isGst ? (sellingBase * (item.gstRate || 0)) / 100 : 0;
    const grossProfit = (sellingBase + sellingGst) - (purchaseBase + purchaseGst);
    const gstDifference = sellingGst - purchaseGst;
    const itemNetProfit = grossProfit - gstDifference;
    return sum + itemNetProfit;
  }, 0);
  // Subtract commission and transport at invoice level
  return itemProfitsSum - (inv.commission || 0) - (inv.transportCharges || 0);
};

// Helper to compute totals for a given invoice
function computeTotals(invoice, purchases) {
  let subTotal = 0;
  let totalGst = 0;
  invoice.items.forEach(item => {
    const amount = item.amount || (item.quantity * item.rate);
    subTotal += amount;
    const itemGst = (item.cgst || 0) + (item.sgst || 0) + (item.igst || 0);
    totalGst += itemGst;
  });
  
  const totalProfit = calculateNetInvoiceProfit(invoice, purchases);
  
  // Grand total includes subTotal, GST, adjustment and transport charges
  const adjustment = Number(invoice.adjustment) || 0;
  const transport = Number(invoice.transportCharges) || 0;
  const grandTotal = subTotal + totalGst + adjustment + transport;
  return { subTotal, totalGst, grandTotal, totalProfit };
}

async function recalcAllInvoices() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/billing', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const invoices = await Invoice.find({});
    const purchases = await Purchase.find({});
    console.log(`Found ${invoices.length} invoices`);

    for (const inv of invoices) {
      const { subTotal, totalGst, grandTotal, totalProfit } = computeTotals(inv, purchases);
      const updates = {};
      if (inv.subTotal !== subTotal) updates.subTotal = subTotal;
      if (inv.totalGst !== totalGst) updates.totalGst = totalGst;
      if (inv.grandTotal !== grandTotal) updates.grandTotal = grandTotal;
      if (inv.totalProfit !== totalProfit) updates.totalProfit = totalProfit;
      if (Object.keys(updates).length > 0) {
        await Invoice.findByIdAndUpdate(inv._id, updates);
        console.log(`Updated invoice ${inv.invoiceNumber} with profit ${totalProfit}`);
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
