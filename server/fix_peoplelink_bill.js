const mongoose = require('mongoose');
require('dotenv').config();
require('./models/Company');
require('./models/User');
const Purchase = require('./models/Purchase');
const Product = require('./models/Product');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  // Fix the specific Peoplelink purchase
  const bill = await Purchase.findOne({ billNumber: 'AUTO-PUR-1783936935139-982' })
    .populate('productId', 'name companyId')
    .populate('companyId', 'name');

  if (!bill) {
    console.log('Bill not found');
    mongoose.disconnect();
    return;
  }

  console.log('Found bill:', bill.billNumber);
  console.log('Product:', bill.productId?.name);
  console.log('Current supplier:', bill.supplierName);
  console.log('Company (who purchased):', bill.companyId?.name);

  if (bill.productId?.name) {
    // Find any source company for this product (not the buying company)
    const sourceProduct = await Product.findOne({
      name: { $regex: new RegExp(`^${bill.productId.name}$`, 'i') },
      companyId: { $nin: [null, bill.companyId?._id] }
    }).populate('companyId', 'name gstin');

    if (sourceProduct?.companyId?.name) {
      console.log(`Correct supplier should be: "${sourceProduct.companyId.name}"`);
      bill.supplierName = sourceProduct.companyId.name;
      bill.supplierGstin = sourceProduct.companyId.gstin || '';
      await bill.save();
      console.log('✅ Fixed!');
    } else {
      // Try Sri Virat as fallback if known
      const sriVirat = await mongoose.model('Company').findOne({ name: /sri virat/i });
      if (sriVirat) {
        bill.supplierName = sriVirat.name;
        await bill.save();
        console.log(`✅ Fixed with Sri Virat: "${sriVirat.name}"`);
      } else {
        console.log('No source company found to fix');
      }
    }
  }

  mongoose.disconnect();
}).catch(err => {
  console.error('DB Error:', err.message);
  mongoose.disconnect();
});
