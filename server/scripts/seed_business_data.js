require('dotenv').config({ path: './server/.env' });
const mongoose = require('mongoose');
const Company = require('../models/Company');
const Product = require('../models/Product');
const Invoice = require('../models/Invoice');
const Purchase = require('../models/Purchase');
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Database URI from .env
const MONGO_URI = process.env.MONGO_URI;

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB...');

    // 1. Clear existing data
    await Company.deleteMany({});
    await Product.deleteMany({});
    await Invoice.deleteMany({});
    await Purchase.deleteMany({});
    await User.deleteMany({});

    // 2. Create Demo Company
    const company = await Company.create({
      name: 'Modern Solutions Pvt Ltd',
      address: 'Suite 405, Tech Hub, Bandra East, Mumbai - 400051',
      phone: '9876543210',
      email: 'contact@modernsol.com',
      gstin: '27AAECM1234F1Z5',
      state: 'Maharashtra',
      bankDetails: {
        bankName: 'HDFC Bank',
        accountNo: '50100234567890',
        ifscCode: 'HDFC0001234',
        branch: 'Bandra West'
      },
      settings: {
        invoicePrefix: 'MSL',
        fyPrefix: '26-27',
        financialYear: '2026-27',
        nextInvoiceNumber: 105,
        invoiceTemplate: 'Modern'
      }
    });

    // 3. Create Admin User
    const hashedBtn = await bcrypt.hash('company123', 10);
    await User.create({
      name: 'Company Admin',
      email: 'company@billpro.com',
      password: hashedBtn,
      role: 'companyadmin',
      companyId: company._id
    });

    // 4. Create Bulk Products
    const products = await Product.insertMany([
      { companyId: company._id, name: 'Samsung Galaxy S24', brand: 'Samsung', category: 'Electronics', sku: 'SAM-S24', barcode: '8806095', purchasePrice: 45000, price: 65000, mrp: 79999, gstRate: 18, stock: 25, unit: 'Pcs' },
      { companyId: company._id, name: 'Nike Air Max', brand: 'Nike', category: 'Footwear', sku: 'NKE-AIR-01', barcode: '19188', purchasePrice: 5000, price: 8500, mrp: 12000, gstRate: 12, stock: 40, unit: 'Pcs' },
      { companyId: company._id, name: 'MacBook Pro M3', brand: 'Apple', category: 'Laptops', sku: 'APL-MBP-M3', barcode: '1942', purchasePrice: 120000, price: 165000, mrp: 199999, gstRate: 18, stock: 10, unit: 'Pcs' },
      { companyId: company._id, name: 'iPhone 15 Pro', brand: 'Apple', category: 'Electronics', sku: 'APL-IP15', purchasePrice: 85000, price: 125000, mrp: 134900, gstRate: 18, stock: 15, unit: 'Pcs' },
      { companyId: company._id, name: 'Dell XPS 13', brand: 'Dell', category: 'Laptops', sku: 'DELL-XPS-13', purchasePrice: 95000, price: 135000, mrp: 150000, gstRate: 18, stock: 5, unit: 'Pcs' },
      { companyId: company._id, name: 'Sony WH-1000XM5', brand: 'Sony', category: 'Accessories', sku: 'SONY-XM5', purchasePrice: 18000, price: 29000, mrp: 34990, gstRate: 18, stock: 30, unit: 'Pcs' },
      { companyId: company._id, name: 'Adidas Ultraboost', brand: 'Adidas', category: 'Footwear', sku: 'ADI-ULTRA', purchasePrice: 7000, price: 15000, mrp: 18999, gstRate: 12, stock: 20, unit: 'Pcs' },
      { companyId: company._id, name: 'Logitech G502', brand: 'Logitech', category: 'Accessories', sku: 'LOGI-G502', purchasePrice: 2500, price: 4500, mrp: 6999, gstRate: 12, stock: 50, unit: 'Pcs' },
      { companyId: company._id, name: 'Software Maintenance', productType: 'Service', category: 'Services', sku: 'SVC-MAINT', price: 15000, gstRate: 18, unit: 'Set' },
      { companyId: company._id, name: 'Cloud Hosting (Annual)', productType: 'Service', category: 'Services', sku: 'SVC-CLOUD', price: 45000, gstRate: 18, unit: 'Set' }
    ]);

    // 5. Create Purchases
    await Purchase.insertMany([
      { companyId: company._id, productId: products[0]._id, supplierName: 'Global Tech Dist', billNumber: 'PUR/001', purchaseDate: new Date('2026-04-10'), quantity: 10, rate: 45000, subTotal: 450000, totalAmount: 531000, isGst: true, totalGst: 81000 },
      { companyId: company._id, productId: products[1]._id, supplierName: 'Sporty Wholesale', billNumber: 'SW/992', purchaseDate: new Date('2026-04-15'), quantity: 20, rate: 5000, subTotal: 100000, totalAmount: 112000, isGst: true, totalGst: 12000 },
      { companyId: company._id, productId: products[3]._id, supplierName: 'Apple India', billNumber: 'APP/771', purchaseDate: new Date('2026-04-20'), quantity: 5, rate: 85000, subTotal: 425000, totalAmount: 501500, isGst: true, totalGst: 76500 }
    ]);

    // 6. Create Bulk Invoices
    const customers = [
      { name: 'Rahul Sharma', phone: '9001122334', address: 'Apartment 12, Worli, Mumbai', state: 'Maharashtra', gstin: '27AAAAA1234A1Z1' },
      { name: 'Creative Studio', phone: '8888777766', address: 'Tech Park, Bangalore', state: 'Karnataka', gstin: '29BBBBB4321B1Z2' },
      { name: 'John Doe', phone: '7776665554', address: 'Pune, Maharashtra', state: 'Maharashtra' },
      { name: 'Anita Verma', phone: '9990001112', address: 'Nagpur', state: 'Maharashtra' },
      { name: 'Future Retail', phone: '9122334455', address: 'Delhi Mall, ND', state: 'Delhi', gstin: '07DDDDD5555D1Z9' },
      { name: 'Tech Geeks Ltd', phone: '9822110022', address: 'IT City, Hyderabad', state: 'Telangana', gstin: '36EEEEE6666E1Z0' }
    ];

    const invoiceData = [];
    for(let i=0; i<15; i++) {
      const cust = customers[i % customers.length];
      const prod = products[i % products.length];
      const isInter = cust.state !== 'Maharashtra';
      const subTotal = prod.price;
      const gstAmt = (subTotal * prod.gstRate) / 100;
      
      invoiceData.push({
        companyId: company._id,
        invoiceNumber: `MSL/26-27/${101 + i}`,
        date: new Date(2026, 4, 1 + i),
        customer: cust,
        items: [{ 
          description: prod.name, 
          quantity: 1, 
          rate: prod.price, 
          gstRate: prod.gstRate, 
          amount: subTotal,
          cgst: !isInter ? gstAmt/2 : 0,
          sgst: !isInter ? gstAmt/2 : 0,
          igst: isInter ? gstAmt : 0,
          total: subTotal + gstAmt 
        }],
        subTotal,
        totalGst: gstAmt,
        grandTotal: subTotal + gstAmt,
        isGst: true,
        status: i % 3 === 0 ? 'paid' : (i % 3 === 1 ? 'unpaid' : 'partially_paid'),
        commission: i % 4 === 0 ? 500 : 0,
        commissionStatus: i % 8 === 0 ? 'paid' : 'unpaid'
      });
    }

    await Invoice.insertMany(invoiceData);

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seed();
