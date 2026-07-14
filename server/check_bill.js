const mongoose = require('mongoose');
require('dotenv').config();
require('./models/Company');
require('./models/User');
const Purchase = require('./models/Purchase');
const Product = require('./models/Product');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('\n=== Check bill HGFK87-4774 full details ===');
  const bill = await Purchase.findOne({ billNumber: 'HGFK87-4774' });
  console.log('Raw purchase document:');
  console.log(JSON.stringify(bill, null, 2));

  console.log('\n=== All purchases, raw companyId values ===');
  const all = await Purchase.find({}).select('billNumber companyId productId quantity createdAt').sort({ createdAt: -1 }).limit(15);
  all.forEach(p => {
    console.log(`Bill: ${p.billNumber} | companyId: ${p.companyId} | productId: ${p.productId} | qty: ${p.quantity}`);
  });

  console.log('\n=== Purchases where companyId = Sithara (6a0c0ae55777d1547374d054) ===');
  const sitharaBills = await Purchase.find({ companyId: '6a0c0ae55777d1547374d054' }).select('billNumber quantity productId');
  sitharaBills.forEach(p => {
    console.log(`Bill: ${p.billNumber} | productId: ${p.productId} | qty: ${p.quantity}`);
  });

  mongoose.disconnect();
}).catch(err => {
  console.error('DB Error:', err.message);
  mongoose.disconnect();
});
