const mongoose = require('mongoose');
const User = require('./models/User');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

const createManager = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to DB');

    const email = 'sriya@billing.com';
    let user = await User.findOne({ email });

    if (user) {
      user.password = 'Nehaal@2026';
      user.role = 'manager';
      await user.save();
      console.log('User updated successfully');
    } else {
      user = new User({
        name: 'Sriya',
        email: email,
        password: 'Nehaal@2026',
        role: 'manager'
      });
      await user.save();
      console.log('User created successfully');
    }

    mongoose.connection.close();
  } catch (err) {
    console.error(err);
    mongoose.connection.close();
  }
};

createManager();
