const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');
const Purchase = require('./models/Purchase');
const Invoice = require('./models/Invoice');

async function recalculateStock() {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected.');

    // 1. Get total purchased quantities for all products
    const purchaseAggr = await Purchase.aggregate([
      { $group: { _id: "$productId", totalPurchased: { $sum: "$quantity" } } }
    ]);
    const purchaseMap = {};
    purchaseAggr.forEach(p => {
      if (p._id) purchaseMap[p._id.toString()] = p.totalPurchased;
    });

    // 2. Get total sold quantities for all products
    const salesAggr = await Invoice.aggregate([
      { $unwind: "$items" },
      { $group: { _id: "$items.productId", totalSold: { $sum: "$items.quantity" } } }
    ]);
    const salesMap = {};
    salesAggr.forEach(s => {
      if (s._id) salesMap[s._id.toString()] = s.totalSold;
    });

    // 3. Update all products
    const products = await Product.find({});
    let updatedCount = 0;

    for (const prod of products) {
      const pid = prod._id.toString();
      const totalPurchased = purchaseMap[pid] || 0;
      const totalSold = salesMap[pid] || 0;
      
      const correctStock = totalPurchased - totalSold;

      if (prod.stock !== correctStock) {
        console.log(`Fixing ${prod.name} (${prod.sku || 'No SKU'}): old stock = ${prod.stock}, new stock = ${correctStock} (Purchased: ${totalPurchased}, Sold: ${totalSold})`);
        prod.stock = correctStock;
        await prod.save();
        updatedCount++;
      }
    }

    console.log(`\nFinished! Updated ${updatedCount} products.`);
    mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    mongoose.disconnect();
  }
}

recalculateStock();
