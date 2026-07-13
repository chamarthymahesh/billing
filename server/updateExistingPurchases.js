const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const Purchase = require('./models/Purchase');
const Product = require('./models/Product');
const Company = require('./models/Company');

async function updateExistingPurchases() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB');

    const purchases = await Purchase.find({ supplierName: 'Auto Generated', totalAmount: 0 });
    console.log(`Found ${purchases.length} auto-generated purchases with zero amount.`);

    for (const purchase of purchases) {
      // Get the product name from the purchase's product reference
      const prod = await Product.findById(purchase.productId);
      if (!prod) continue;

      // Find a product with same name that belongs to another company and has a valid price
      const sourceProd = await Product.findOne({
        name: { $regex: new RegExp(`^${prod.name}$`, 'i') },
        _id: { $ne: prod._id },
        companyId: { $ne: null },
        $or: [
          { purchasePrice: { $gt: 0 } },
          { price: { $gt: 0 } }
        ]
      }).populate('companyId', 'name').sort({ updatedAt: -1 });

      if (!sourceProd) {
        console.log(`No source product with price found for purchase ${purchase._id}`);
        continue;
      }

      const rate = sourceProd.purchasePrice || sourceProd.price || 0;
      const supplierName = sourceProd.companyId && sourceProd.companyId.name ? sourceProd.companyId.name : 'Auto Transfer';
      const subTotal = purchase.quantity * rate;
      const gstAmount = (subTotal * (prod.gstRate || 0)) / 100;
      const totalAmount = subTotal + gstAmount;

      purchase.supplierName = supplierName;
      purchase.rate = rate;
      purchase.subTotal = subTotal;
      purchase.totalGst = gstAmount;
      purchase.totalAmount = totalAmount;

      await purchase.save();
      console.log(`Updated purchase ${purchase.billNumber}: supplier=${supplierName}, rate=${rate}, total=${totalAmount}`);
    }

    console.log('Update complete.');
    process.exit(0);
  } catch (err) {
    console.error('Error during update:', err);
    process.exit(1);
  }
}

updateExistingPurchases();
