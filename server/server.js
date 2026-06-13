const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

connectDB();

const app = express();

// Manual preflight handler — catches OPTIONS before anything else
// This ensures Cloudflare proxied preflight requests always get CORS headers
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Max-Age', '86400');
  return res.sendStatus(200);
});

app.use(cors({
  origin: [
    'https://billing.apnakartz.com',
    'http://billing.apnakartz.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Request Logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes Placeholder
app.get('/', (req, res) => {
  res.send('Billing API is running...');
});

// Import Routes
const authRoutes = require('./routes/authRoutes');
const companyRoutes = require('./routes/companyRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const productRoutes = require('./routes/productRoutes');
const purchaseRoutes = require('./routes/purchaseRoutes');
const transportRoutes = require('./routes/transportRoutes');
const employeeRoutes = require('./routes/employeeRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/products', productRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/employees', employeeRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
