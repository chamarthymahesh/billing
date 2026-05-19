const mongoose = require('mongoose');
require('dotenv').config();

const Invoice = require('../models/Invoice');
const Company = require('../models/Company');

async function checkHanuman() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/billing', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    const company = await Company.findOne({ name: { $regex: /hanuman/i } });
    if (!company) {
      console.log('Could not find Hanuman Enterprises');
      process.exit(1);
    }
    
    console.log(`Found Company: ${company.name}`);

    const invoices = await Invoice.find({ companyId: company._id }).limit(5).sort({ date: -1 });
    
    if (invoices.length === 0) {
      console.log('No invoices found for this company.');
    } else {
      invoices.forEach(inv => {
        console.log(`\nInvoice #: ${inv.invoiceNumber}`);
        console.log(`SubTotal: ₹${inv.subTotal}`);
        console.log(`Total GST: ₹${inv.totalGst}`);
        console.log(`Transport Charges: ₹${inv.transportCharges || 0}`);
        console.log(`Commission: ₹${inv.commission || 0}`);
        console.log(`Adjustment: ₹${inv.adjustment || 0}`);
        console.log(`-----------------------------------`);
        console.log(`Grand Total (Sub + GST + Transport + Adj): ₹${inv.grandTotal}`);
        console.log(`Total Profit (Item Profit - Transport - Commission): ₹${inv.totalProfit}`);
      });
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

checkHanuman();
