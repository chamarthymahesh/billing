const Product = require('../models/Product');
const Purchase = require('../models/Purchase');
const Invoice = require('../models/Invoice');

exports.createProduct = async (req, res) => {
  try {
    const companyId = req.user.role === 'superadmin' ? null : req.user.companyId;
    const product = await Product.create({ ...req.body, companyId });
    res.status(201).json(product);
  } catch (error) {
    if (error.code === 11000 && error.keyPattern && error.keyPattern.sku) {
      return res.status(400).json({ message: 'A product with this SKU already exists.' });
    }
    res.status(500).json({ message: error.message });
  }
};

exports.getProducts = async (req, res) => {
  try {
      if (req.query.filter === 'purchased') {
        // Retrieve purchases and invoices across ALL companies (global view)
        const [purchases, invoices] = await Promise.all([
          Purchase.find({}),
          Invoice.find({})
        ]);
      
      const productIds = new Set();
      purchases.forEach(p => p.productId && productIds.add(p.productId.toString()));
      invoices.forEach(inv => {
        if (inv.items) {
          inv.items.forEach(item => {
            if (item.productId) productIds.add(item.productId.toString());
          });
        }
      });
      
      const products = await Product.find({ _id: { $in: Array.from(productIds) } });
      return res.json(products);
    }
    // Return all products globally to all users by default
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * GET /api/products/negative-stock
 * Returns all products with negative stock, grouped by company.
 * superadmin/manager: all companies
 * companyadmin: own company only
 */
exports.getNegativeStock = async (req, res) => {
  try {
    const Company = require('../models/Company');
    const Invoice = require('../models/Invoice'); // Added to determine source company for global products
    const isAdminLike = req.user.role === 'superadmin' || req.user.role === 'manager';

    const filter = isAdminLike
      ? { stock: { $lt: 0 } }
      : { companyId: { $in: [req.user.companyId, null] }, stock: { $lt: 0 } };

    const products = await Product.find(filter).populate('companyId', 'name').lean();

    // Group by company, using sale's companyId for products without an explicit companyId
    const grouped = {};
    for (const p of products) {
      let cId = p.companyId?._id?.toString();
      let cName = p.companyId?.name;

      // If product has no companyId, attempt to infer from a sale invoice
      if (!cId) {
        const saleInvoice = await Invoice.findOne({ 'items.productId': p._id }).sort({ createdAt: -1 }).lean();
        if (saleInvoice && saleInvoice.companyId) {
          cId = saleInvoice.companyId.toString();
          // Fetch company name for display
          const comp = await Company.findById(cId).select('name').lean();
          cName = comp ? comp.name : 'Unknown Company';
        } else {
          cId = 'unknown';
          cName = 'Unknown Company';
        }
      }

      if (!grouped[cId]) grouped[cId] = { companyId: cId, companyName: cName, products: [] };
      grouped[cId].products.push({
        _id: p._id,
        name: p.name,
        brand: p.brand,
        sku: p.sku,
        stock: p.stock,
        purchasePrice: p.purchasePrice,
        price: p.price,
        unit: p.unit,
      });
    }

    res.json(Object.values(grouped));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
