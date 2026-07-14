const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

// Models
require('./models/Company');
require('./models/Product');
require('./models/Invoice');
require('./models/Purchase');

const Invoice = mongoose.model('Invoice');
const Purchase = mongoose.model('Purchase');

// Use the same profit helper from the controller if possible
const { calculateNetInvoiceProfit } = require('./controllers/invoiceController');

async function analyzeInvoice(invoiceNumber) {
  await mongoose.connect(process.env.MONGO_URI);
  const inv = await Invoice.findOne({ invoiceNumber })
    .populate('items.productId', 'name')
    .populate('companyId', 'name');
  if (!inv) {
    console.log('Invoice not found');
    process.exit(0);
  }

  const productIds = inv.items.map(i => i.productId?._id).filter(Boolean);
  const purchases = await Purchase.find({
    companyId: inv.companyId?._id,
    productId: { $in: productIds }
  }).select('productId rate quantity subTotal totalGst packagingCharges transportCharges miscCharges');

  // Compute profit using the same helper
  const computedProfit = calculateNetInvoiceProfit(inv, purchases);

  console.log('--- Invoice Summary ---');
  console.log('Invoice #:', inv.invoiceNumber);
  console.log('Company   :', inv.companyId?.name);
  console.log('Stored profit:', inv.totalProfit);
  console.log('Computed profit:', computedProfit);
  console.log('Difference   :', (inv.totalProfit - computedProfit).toFixed(2));
  console.log('\nItem‑level breakdown:');
  for (const item of inv.items) {
    const match = purchases.find(p => p.productId?.toString() === item.productId?._id.toString());
    let purchaseCostPerUnit = 0;
    if (match && match.quantity > 0) {
      const unitBase = match.subTotal / match.quantity;
      const otherCharges = (match.packagingCharges || 0) + (match.transportCharges || 0) + (match.miscCharges || 0);
      const unitOther = otherCharges / match.quantity;
      purchaseCostPerUnit = unitBase + unitOther;
    } else {
      purchaseCostPerUnit = Number(item.purchasePrice) || 0;
    }
    const sellingRate = Number(item.rate) || 0;
    const qty = Number(item.quantity) || 0;
    const itemProfit = (sellingRate - purchaseCostPerUnit) * qty;
    console.log(`- ${item.productId?.name || 'Unknown'}:`);
    console.log(`  qty=${qty}, sellingRate=${sellingRate}, purchaseCostPerUnit=${purchaseCostPerUnit.toFixed(2)}, itemProfit=${itemProfit.toFixed(2)}`);
  }
  console.log('\nInvoice‑level deductions:');
  console.log('  commission        :', Number(inv.commission) || 0);
  console.log('  transportCharges  :', Number(inv.transportCharges) || 0);
  console.log('  computed net profit (items – deductions):', computedProfit.toFixed(2));

  await mongoose.disconnect();
  process.exit(0);
}

analyzeInvoice('INV/26-27/015');
