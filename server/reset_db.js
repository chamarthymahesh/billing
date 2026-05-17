const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Models
const User = require('./models/User');
const Company = require('./models/Company');
const Invoice = require('./models/Invoice');
const Product = require('./models/Product');
const Purchase = require('./models/Purchase');
const Transport = require('./models/Transport');
const Employee = require('./models/Employee');
const SalaryRecord = require('./models/SalaryRecord');

dotenv.config();

const resetDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to DB. Clearing dummy data...');

    await User.deleteMany({});
    await Company.deleteMany({});
    await Invoice.deleteMany({});
    await Product.deleteMany({});
    await Purchase.deleteMany({});
    await Transport.deleteMany({});
    await Employee.deleteMany({});
    // SalaryRecord might not exist if unused, but let's try safely
    if (SalaryRecord) await SalaryRecord.deleteMany({}).catch(() => {});

    console.log('Dummy data cleared.');

    console.log('Creating Super Admin...');
    await User.create({
      name: 'Super Admin',
      email: 'mahesh@gmail.com',
      password: 'Nehaal@2026',
      role: 'superadmin'
    });
    
    console.log('Super Admin created successfully: mahesh@gmail.com');
    process.exit(0);
  } catch (err) {
    console.error('Error resetting DB:', err);
    process.exit(1);
  }
};

resetDB();
