const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/User');
const Company = require('../models/Company'); // to register model for populate

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/billing', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');

    // Find user for Jyothi
    let user = await User.findOne({ name: { $regex: /jyothi/i } }).populate('companyId');
    if (!user) {
        user = await User.findOne({ email: { $regex: /jyothi/i } }).populate('companyId');
    }
    
    if (!user) {
      console.log('No user found for Jyothi. Checking all users:');
      const users = await User.find({}).populate('companyId');
      users.forEach(u => console.log(`Available user: ${u.name} (${u.email}) - Company: ${u.companyId ? u.companyId.name : 'None'}`));
      process.exit(1);
    }

    console.log(`Found user: ${user.name} (${user.email}), Company: ${user.companyId ? user.companyId.name : 'Super Admin'}`);
    
    // User schema automatically hashes password on save
    user.password = 'Jyothi@123';
    await user.save();
    
    console.log(`Password successfully reset to: Jyothi@123 for email: ${user.email}`);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

resetPassword();
