
const mongoose = require('mongoose');
const Invoice = require('./models/Invoice');
require('dotenv').config({ path: './.env' });

async function check() {
  await mongoose.connect(process.env.MONGO_URI);
  const invs = await Invoice.find({ invoiceNumber: { $in: ['JE/26-27/001', 'JE/26-27/002', 'JE/26-27/003'] } });
  invs.forEach(inv => {
    console.log(inv.invoiceNumber, inv.totalProfit);
  });
  process.exit();
}
check();

