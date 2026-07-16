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
    const isSuperAdmin = req.user.role === 'superadmin';
    const isManager = req.user.role === 'manager';

    let filter;
    if (isSuperAdmin) {
      // Superadmin sees ALL companies' negative stock
      filter = { stock: { $lt: 0 } };
    } else if (isManager) {
      // Manager sees only their own company's negative stock
      filter = { companyId: req.user.companyId, stock: { $lt: 0 } };
    } else {
      // Company admin / staff: only their own company — no null/global products
      filter = { companyId: req.user.companyId, stock: { $lt: 0 } };
    }

    const products = await Product.find(filter).populate('companyId', 'name').lean();

    // Group by company
    const grouped = {};
    for (const p of products) {
      const cId = p.companyId?._id?.toString() || 'unknown';
      const cName = p.companyId?.name || 'Unknown Company';

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
