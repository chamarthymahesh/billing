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

    const purchases = await Purchase.find({ supplierName: 'Auto Generated' });
    console.log(`Found ${purchases.length} auto-generated purchases to update.`);

    for (const purchase of purchases) {
      const prod = await Product.findById(purchase.productId);
      if (!prod) { console.log(`Product not found for purchase ${purchase.billNumber}`); continue; }

      // First try: find same product in another company with companyId and valid price
      let sourceProd = await Product.findOne({
        name: { $regex: new RegExp(`^${prod.name}$`, 'i') },
        _id: { $ne: prod._id },
        companyId: { $ne: null },
        $or: [{ purchasePrice: { $gt: 0 } }, { price: { $gt: 0 } }]
      }).populate('companyId', 'name').sort({ updatedAt: -1 });

      // Second try: any product with same name and valid price (even companyId null)
      if (!sourceProd) {
        sourceProd = await Product.findOne({
          name: { $regex: new RegExp(`^${prod.name}$`, 'i') },
          $or: [{ purchasePrice: { $gt: 0 } }, { price: { $gt: 0 } }]
        }).populate('companyId', 'name').sort({ updatedAt: -1 });
      }

      if (!sourceProd) {
        console.log(`No valid price found for purchase ${purchase.billNumber} (Product: ${prod.name})`);
        continue;
      }

      const rate = sourceProd.purchasePrice || sourceProd.price || 0;
      let supplierName = 'Auto Generated';
      if (sourceProd.companyId && sourceProd.companyId.name) {
        supplierName = sourceProd.companyId.name;
      } else {
        // Try to find a purchase for this product to get supplier name
        const existingPurchase = await Purchase.findOne({
          productId: sourceProd._id,
          supplierName: { $ne: 'Auto Generated' }
        }).sort({ purchaseDate: -1 });
        if (existingPurchase) {
          supplierName = existingPurchase.supplierName;
        }
      }

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
