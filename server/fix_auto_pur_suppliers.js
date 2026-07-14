const mongoose = require('mongoose');
require('dotenv').config();
require('./models/Company');
require('./models/User');
const Purchase = require('./models/Purchase');
const Product = require('./models/Product');

// Fix all AUTO-PUR purchases that have wrong supplier names (e.g. Peoplelink instead of Sri Virat)
mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Finding all AUTO-PUR purchases...');
  
  const autoPurs = await Purchase.find({
    billNumber: /^AUTO-PUR-/
  }).populate('productId', 'name companyId').populate('companyId', 'name');

  console.log(`Found ${autoPurs.length} AUTO-PUR purchases`);

  for (const pur of autoPurs) {
    if (!pur.productId?.name) continue;
    
    // Find the correct source company for this product (any company with stock, excluding the purchase company)
    const sourceProduct = await Product.findOne({
      name: { $regex: new RegExp(`^${pur.productId.name}$`, 'i') },
      companyId: { $nin: [null, pur.companyId?._id] },
    }).populate('companyId', 'name gstin');

    if (sourceProduct && sourceProduct.companyId?.name) {
      const correctSupplier = sourceProduct.companyId.name;
      if (pur.supplierName !== correctSupplier) {
        console.log(`Fixing: ${pur.billNumber}`);
        console.log(`  Product: ${pur.productId.name}`);
        console.log(`  Wrong supplier: "${pur.supplierName}"`);
        console.log(`  Correct supplier: "${correctSupplier}"`);
        
        pur.supplierName = correctSupplier;
        pur.supplierGstin = sourceProduct.companyId.gstin || pur.supplierGstin;
        await pur.save();
        console.log(`  ✅ Fixed!`);
      } else {
        console.log(`OK: ${pur.billNumber} - supplier "${pur.supplierName}" is correct`);
      }
    }
  }

  console.log('\nDone!');
  mongoose.disconnect();
}).catch(err => {
  console.error('DB Error:', err.message);
  mongoose.disconnect();
});
