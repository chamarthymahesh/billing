const mongoose = require('mongoose');
require('dotenv').config();

// Load all models so mongoose registers them
require('./models/Company');
require('./models/User');
const Product = require('./models/Product');

const REGISTER_PRODUCT_ID = '6a1184513eb194088955786c';
const SITHARA_COMPANY_ID = '6a0c0ae55777d1547374d054';

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('Fixing product companyId...');
  
  const result = await Product.findByIdAndUpdate(
    REGISTER_PRODUCT_ID,
    { companyId: SITHARA_COMPANY_ID },
    { new: true }
  );

  if (result) {
    console.log(`✅ Fixed! Product "${result.name}" companyId set to Sithara`);
    console.log(`   _id: ${result._id}`);
    console.log(`   companyId: ${result.companyId}`);
    console.log(`   Stock: ${result.stock}`);
    console.log(`   Purchase Price: ${result.purchasePrice}`);
  } else {
    console.log('❌ Product not found!');
  }

  mongoose.disconnect();
}).catch(err => {
  console.error('DB Error:', err.message);
  mongoose.disconnect();
});
