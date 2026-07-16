const mongoose = require('mongoose');
require('dotenv').config();
const Product = require('./models/Product');
const Company = require('./models/Company');

async function test() {
  await mongoose.connect(process.env.MONGO_URI);
  const products = await Product.find({ stock: { $lt: 0 }, companyId: { $ne: null } }).lean();
  
  const craftsoft = await Company.findOne({ name: /CRAFTSOFT/i });
  let craftsoftCount = 0;
  let otherCount = 0;
  
  products.forEach(p => {
    if (p.companyId.toString() === craftsoft._id.toString()) craftsoftCount++;
    else otherCount++;
  });
  
  console.log(`Negative products for Craftsoft: ${craftsoftCount}`);
  console.log(`Negative products for other companies: ${otherCount}`);
  
  mongoose.disconnect();
}
test();
