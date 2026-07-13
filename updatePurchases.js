const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, 'server', '.env') });

const Purchase = require('./server/models/Purchase');
const Product = require('./server/models/Product');
const Company = require('./server/models/Company');

async function updatePurchases() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to DB');

    const autoPurchases = await Purchase.find({
      supplierName: 'Auto Generated',
      totalAmount: 0
    });

    console.log(`Found ${autoPurchases.length} auto-generated purchases with 0 amount to update.`);

    for (const purchase of autoPurchases) {
      const prod = await Product.findById(purchase.productId);
      if (!prod) continue;

      const productWithPrice = await Product.findOne({
        name: { $regex: new RegExp(`^${prod.name}$`, 'i') },
        _id: { $ne: prod._id },
        $or: [
          { purchasePrice: { $gt: 0 } },
          { price: { $gt: 0 } }
        ]
      }).sort({ updatedAt: -1 }).populate('companyId', 'name');

      let rate = prod.purchasePrice || prod.price || 0;
      let supplierName = 'Auto Generated';

      if (productWithPrice) {
        rate = productWithPrice.purchasePrice || productWithPrice.price || 0;
        if (productWithPrice.companyId && productWithPrice.companyId.name) {
          supplierName = productWithPrice.companyId.name;
        } else {
          supplierName = 'Auto Transfer';
        }
      }

      if (rate > 0 || supplierName !== 'Auto Generated') {
        const subTotal = purchase.quantity * rate;
        const gstAmount = (subTotal * (prod.gstRate || 0)) / 100;
        const totalAmount = subTotal + gstAmount;

        purchase.supplierName = supplierName;
        purchase.rate = rate;
        purchase.subTotal = subTotal;
        purchase.totalGst = gstAmount;
        purchase.totalAmount = totalAmount;

        await purchase.save();
        console.log(`Updated Purchase ${purchase.billNumber}: Supplier=${supplierName}, Rate=${rate}, Total=${totalAmount}`);
      } else {
        console.log(`Could not find a valid price/supplier for ${purchase.billNumber} (Product: ${prod.name}).`);
      }
    }
    
    console.log('Done updating purchases.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

updatePurchases();
