const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');

dotenv.config();

const seedSuperAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    
    const adminExists = await User.findOne({ email: 'admin@billpro.com' });
    if (adminExists) {
      console.log('Super Admin already exists');
      process.exit(0);
    }

    await User.create({
      name: 'Super Admin',
      email: 'admin@billpro.com',
      password: 'adminpassword123',
      role: 'superadmin'
    });

    console.log('Super Admin created successfully');
    console.log('Email: admin@billpro.com');
    console.log('Password: adminpassword123');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding admin:', err);
    process.exit(1);
  }
};

seedSuperAdmin();
