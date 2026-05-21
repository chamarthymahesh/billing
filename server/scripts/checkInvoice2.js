const mongoose = require('mongoose');
require('dotenv').config();

const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');

async function checkInvoice() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/billing', { useNewUrlParser: true, useUnifiedTopology: true });
  
  const inv = await Invoice.findOne({ invoiceNumber: 'JE/26-27/002' });
  if (!inv) {
    console.log('Invoice not found');
    process.exit(1);
  }
  
  const purchases = await Purchase.find({ companyId: inv.companyId });
  
  console.log(`Invoice #: ${inv.invoiceNumber}`);
  console.log(`Grand Total (Revenue): ${inv.grandTotal}`);
  console.log(`Total Profit: ${inv.totalProfit}`);
  console.log(`Transport Charges: ${inv.transportCharges}`);
  console.log(`Commission: ${inv.commission}`);
  
  console.log('\n--- Invoice Items ---');
  inv.items.forEach(item => {
    console.log(`- Product ID: ${item.productId}`);
    console.log(`  Description: ${item.description}`);
    console.log(`  Quantity: ${item.quantity}, Rate: ${item.rate}, Amount: ${item.amount}, Total(w/ GST): ${item.total}`);
    
    // Find matching purchase
    const matchedPurchase = purchases.find(p => p.productId?.toString() === item.productId?.toString());
    if (matchedPurchase) {
      console.log(`  -> Matched Purchase:`);
      console.log(`     Purchase Qty: ${matchedPurchase.quantity}, Subtotal: ${matchedPurchase.subTotal}`);
      console.log(`     Purchase totalAmount: ${matchedPurchase.totalAmount}, totalGst: ${matchedPurchase.totalGst}`);
      
      const unitBase = matchedPurchase.subTotal / matchedPurchase.quantity;
      const unitGst = (matchedPurchase.totalGst || 0) / matchedPurchase.quantity;
      const otherCharges = (matchedPurchase.packagingCharges || 0) + (matchedPurchase.transportCharges || 0) + (matchedPurchase.miscCharges || 0);
      const unitOther = otherCharges / matchedPurchase.quantity;
      
      const purchaseBase = (unitBase + unitOther) * item.quantity;
      const purchaseGst = unitGst * item.quantity;
      console.log(`     Calculated Purchase Cost for ${item.quantity} qty = Base: ${purchaseBase} + GST: ${purchaseGst} = ${purchaseBase + purchaseGst}`);
      
      const sellingBase = item.amount || (item.quantity * item.rate);
      const sellingGst = item.isGst ? (sellingBase * (item.gstRate || 0)) / 100 : 0;
      const grossProfit = (sellingBase + sellingGst) - (purchaseBase + purchaseGst);
      const gstDifference = sellingGst - purchaseGst;
      const itemNetProfit = grossProfit - gstDifference;
      
      console.log(`     Item Gross Profit: ${grossProfit}, GST Diff: ${gstDifference}, Item Net Profit: ${itemNetProfit}`);
    } else {
      console.log(`  -> No Matched Purchase found. Fallback item purchase price: ${item.purchasePrice}`);
    }
  });

  process.exit(0);
}
checkInvoice();
