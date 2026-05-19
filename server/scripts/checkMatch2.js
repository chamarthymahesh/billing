const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/Product');

async function check() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/billing', { useNewUrlParser: true, useUnifiedTopology: true });
  
  const p1 = await Product.findById('6a09db5a74cfc1dd607ee89d');
  const p2 = await Product.findById('6a09dd6174cfc1dd607ee8de');
  
  console.log('Invoice Product:', p1?.name);
  console.log('Purchase Product:', p2?.name);
  
  process.exit(0);
}
check();
