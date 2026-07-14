const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });
require('./models/Company');
require('./models/Product');
require('./models/Invoice');
require('./models/Purchase');

const Invoice = mongoose.model('Invoice');
const Purchase = mongoose.model('Purchase');
const { calculateNetInvoiceProfit } = require('./controllers/invoiceController');

async function checkRealInvoice() {
  await mongoose.connect(process.env.MONGO_URI);
  const inv = await Invoice.findById('6a54b7a7b3ebdd58a7c0257a')
    .populate('items.productId', 'name')
    .populate('companyId', 'name');

  const productIds = inv.items.map(i => i.productId?._id).filter(Boolean);
  const purchases = await Purchase.find({
    companyId: inv.companyId?._id,
    productId: { $in: productIds }
  }).select('productId rate quantity subTotal totalGst packagingCharges transportCharges miscCharges');

  console.log('--- Real Invoice Check ---');
  console.log('Invoice #:', inv.invoiceNumber);
  console.log('Company:', inv.companyId?.name);
  console.log('Grand Total (SP with tax):', inv.grandTotal);
  console.log('Stored Profit:', inv.totalProfit);
  
  let totalComputedBasePurchase = 0;
  
  console.log('\n--- Line Items ---');
  for (const item of inv.items) {
    const match = purchases.find(p => p.productId?.toString() === item.productId?._id.toString());
    let purchaseCostPerUnit = 0;
    if (match && match.quantity > 0) {
      const unitBase = match.subTotal / match.quantity;
      const otherCharges = (match.packagingCharges || 0) + (match.transportCharges || 0) + (match.miscCharges || 0);
      purchaseCostPerUnit = unitBase + (otherCharges / match.quantity);
    } else {
      purchaseCostPerUnit = Number(item.purchasePrice) || 0;
    }
    const sellingRate = Number(item.rate) || 0;
    const qty = Number(item.quantity) || 0;
    
    totalComputedBasePurchase += (purchaseCostPerUnit * qty);
    
    console.log(`- ${item.productId?.name}`);
    console.log(`  Selling Base: ${(sellingRate * qty).toFixed(2)}`);
    console.log(`  Purchase Base: ${(purchaseCostPerUnit * qty).toFixed(2)}`);
    console.log(`  Item Profit: ${((sellingRate - purchaseCostPerUnit) * qty).toFixed(2)}`);
  }

  console.log(`\nTotal Base Purchase Cost Computed: ${totalComputedBasePurchase.toFixed(2)}`);
  console.log(`With 18% Tax, this would be: ${(totalComputedBasePurchase * 1.18).toFixed(2)}`);
  console.log(`Your Handwritten CP: 714596.20`);
  console.log(`Deductions: Commission=${inv.commission}, Transport=${inv.transportCharges}`);
  
  mongoose.disconnect();
}
checkRealInvoice();
