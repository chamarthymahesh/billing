const mongoose = require('mongoose');
const Product = require('./models/Product');
const dotenv = require('dotenv');
dotenv.config();

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    console.log('Connected to MongoDB');
    const products = await Product.find({ name: { $regex: /COSCO/i } });
    console.log('Found products:', products);
    mongoose.connection.close();
  })
  .catch(err => console.error(err));
