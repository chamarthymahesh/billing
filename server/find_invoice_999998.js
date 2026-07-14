const mongoose = require('mongoose');
require('dotenv').config();
require('./models/Invoice');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const Invoice = mongoose.model('Invoice');
  
  // Find invoices with grandTotal close to 999998
  const invoices = await Invoice.find({
    grandTotal: { $gte: 999000, $lte: 1001000 }
  }).select('invoiceNumber grandTotal totalProfit subTotal');

  console.log("Invoices with grandTotal ~ 999998:");
  console.log(invoices);
  
  mongoose.disconnect();
});
