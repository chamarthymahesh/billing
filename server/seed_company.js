const mongoose = require('mongoose');
const User = require('./models/User');
const Company = require('./models/Company');
require('dotenv').config();

const seedCompany = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // 1. Create a Company
    let company = await Company.findOne({ email: 'contact@techsolutions.com' });
    if (!company) {
      company = await Company.create({
        name: 'Tech Solutions Pvt Ltd',
        gstin: '27AAACT1234A1Z1',
        address: '123 Business Park, Mumbai, MH',
        phone: '9876543210',
        email: 'contact@techsolutions.com',
        settings: {
          hasGst: true,
          invoicePrefix: 'TS',
          nextInvoiceNumber: 101
        }
      });
      console.log('Company created');
    }

    // 2. Create a Company Admin User
    const adminExists = await User.findOne({ email: 'company@billpro.com' });
    if (!adminExists) {
      await User.create({
        name: 'Company Admin',
        email: 'company@billpro.com',
        password: 'company123',
        role: 'companyadmin',
        companyId: company._id
      });
      console.log('Company Admin user created');
    } else {
      console.log('Company Admin already exists');
    }

    console.log('Seeding completed successfully');
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedCompany();
