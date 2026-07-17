const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

const path = require('path');
dotenv.config({ path: path.join(__dirname, '.env') });

connectDB();

const app = express();

const ALLOWED_ORIGINS = [
  'https://billing.apnakartz.com',
  'http://billing.apnakartz.com',
  'http://localhost:3000',
  'http://localhost:5173'
];

// Robust CORS middleware — handles both OPTIONS preflight and normal requests
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  } else if (!origin) {
    // Non-browser requests (e.g. curl, Postman) — allow
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Requested-With');
  res.header('Access-Control-Max-Age', '86400');

  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(cors({
  origin: ALLOWED_ORIGINS,
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
const reportRoutes = require('./routes/reportRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/products', productRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/transport', transportRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/reports', reportRoutes);

// Setup cron job for GSTR-1
const cron = require('node-cron');
const { generateGSTR1Report } = require('./controllers/gstr1Controller');
const fs = require('fs');

// Run daily at midnight to generate report for previous month if not exists
cron.schedule(process.env.GSTR1_CRON || '0 0 * * *', async () => {
  console.log('Running daily GSTR-1 cron job...');
  try {
    const date = new Date();
    let month = date.getMonth(); // previous month
    let year = date.getFullYear();
    if (month === 0) {
      month = 12;
      year -= 1;
    }
    
    // Using a mock req/res for controller
    const req = { query: { month, year } };
    
    // In a real multi-tenant scenario, we might iterate over companies
    const Company = require('./models/Company');
    const companies = await Company.find({ isActive: true });
    
    const reportsDir = path.join(__dirname, process.env.GSTR1_OUTPUT_DIR || 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    for (const company of companies) {
      req.user = { companyId: company._id }; // Mock user
      const payload = await generateGSTR1Report(req, null); // passing null res to return data directly
      if (payload) {
        const filePath = path.join(reportsDir, `gstr1_${company._id}_${year}_${month}.json`);
        fs.writeFileSync(filePath, JSON.stringify(payload, null, 2));
        console.log(`Saved GSTR-1 for ${company.name} at ${filePath}`);
      }
    }
  } catch (error) {
    console.error('Cron job error:', error);
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
