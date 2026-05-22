/*
  updateStockDeficit.js
  -------------------------------------------------
  This script iterates through all invoices in chronological order,
  applies the stock adjustments (decrementing product.stock for each
  invoice item), and records when stock goes negative. For any invoice
  where a deficit occurs, the script updates the `stockDeficit` flag on
  the Invoice document.

  Run with: `node server/scripts/updateStockDeficit.js`
*/

const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Product = require('../models/Product');

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/billing', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Load invoices sorted by creation date (oldest first)
    const invoices = await Invoice.find({}).sort({ createdAt: 1 });
    console.log(`🔎 Found ${invoices.length} invoices`);

    for (const inv of invoices) {
      let deficit = false;
      for (const item of inv.items) {
        if (!item.productId) continue;
        const prod = await Product.findById(item.productId);
        if (!prod) continue;
        // Apply the same stock reduction logic used when creating an invoice
        prod.stock = (prod.stock || 0) - Number(item.quantity);
        if (prod.stock < 0) deficit = true;
        await prod.save();
      }
      // Update the invoice flag only when it differs from the current value
      if (deficit && !inv.stockDeficit) {
        await Invoice.findByIdAndUpdate(inv._id, { stockDeficit: true });
        console.log(`⚠️ Invoice ${inv.invoiceNumber} marked as deficit`);
      }
    }
    console.log('✅ Finished processing invoices');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err);
    process.exit(1);
  }
}

main();
