const mongoose = require('mongoose');
require('dotenv').config();

const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');

async function fix() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/billing', { useNewUrlParser: true, useUnifiedTopology: true });
  
  // Find the purchase for SCHOOL BAGS
  const purchases = await Purchase.find({ productId: '6a09dd6174cfc1dd607ee8de' });
  
  for (let p of purchases) {
    p.productId = '6a09db5a74cfc1dd607ee89d'; // Change to invoice's product ID
    await p.save();
    console.log('Fixed purchase product ID');
  }
  
  process.exit(0);
}
fix();
