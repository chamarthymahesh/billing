const Purchase = require('../models/Purchase');
const Product = require('../models/Product');

exports.createPurchase = async (req, res) => {
  try {
    const { productId, quantity, rate, gstRate, isGst } = req.body;
    
    // Calculate totals
    const subTotal = quantity * rate;
    let totalGst = 0;
    let cgst = 0, sgst = 0, igst = 0;

    if (isGst) {
      totalGst = (subTotal * gstRate) / 100;
      cgst = totalGst / 2;
      sgst = totalGst / 2;
    }

    const totalAmount = subTotal + totalGst;

    const purchase = await Purchase.create({
      ...req.body,
      companyId: req.user.companyId || req.body.companyId,
      subTotal,
      totalGst,
      cgst,
      sgst,
      igst,
      totalAmount
    });

    // Update product stock
    const product = await Product.findById(productId);
    if (product) {
      product.stock += Number(quantity);
      await product.save();
    }

    res.status(201).json(purchase);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPurchases = async (req, res) => {
  try {
    const filter = req.user.role === 'superadmin' ? {} : { companyId: req.user.companyId };
    const purchases = await Purchase.find(filter)
      .populate('productId', 'name sku')
      .populate('companyId', 'name')
      .sort({ createdAt: -1 });
    res.json(purchases);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getGlobalStock = async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const stocks = await Product.find({})
      .populate('companyId', 'name')
      .select('name stock companyId sku');
    res.json(stocks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });
    
    const updated = await Purchase.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deletePurchase = async (req, res) => {
  try {
    const purchase = await Purchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ message: 'Purchase not found' });

    // Revert product stock
    const product = await Product.findById(purchase.productId);
    if (product) {
      product.stock -= Number(purchase.quantity);
      await product.save();
    }

    await Purchase.findByIdAndDelete(req.params.id);
    res.json({ message: 'Purchase deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePurchaseBill = async (req, res) => {
  try {
    const { billNumber } = req.params;
    const companyId = req.user.role === 'superadmin' ? req.body.companyId || req.user.companyId : req.user.companyId;

    const existingPurchases = await Purchase.find({ billNumber, companyId });
    if (!existingPurchases.length) return res.status(404).json({ message: 'Bill not found' });

    for (const ep of existingPurchases) {
      const product = await Product.findById(ep.productId);
      if (product) {
        product.stock -= Number(ep.quantity);
        await product.save();
      }
    }

    await Purchase.deleteMany({ billNumber, companyId });

    const { items, supplierName, supplierGstin, billNumber: newBillNumber, purchaseDate, paymentStatus, packagingCharges, transportCharges, miscCharges } = req.body;
    
    for (const item of items) {
      const subTotal = item.quantity * item.rate;
      let totalGst = 0, cgst = 0, sgst = 0;
      if (item.isGst) {
        totalGst = (subTotal * item.gstRate) / 100;
        cgst = totalGst / 2;
        sgst = totalGst / 2;
      }
      const totalAmount = subTotal + totalGst;

      await Purchase.create({
        companyId,
        productId: item.productId,
        supplierName,
        supplierGstin,
        billNumber: newBillNumber,
        purchaseDate,
        paymentStatus,
        quantity: item.quantity,
        rate: item.rate,
        gstRate: item.gstRate,
        isGst: item.isGst,
        packagingCharges: Number(packagingCharges || 0),
        transportCharges: Number(transportCharges || 0),
        miscCharges: Number(miscCharges || 0),
        subTotal,
        totalGst,
        cgst,
        sgst,
        totalAmount
      });

      const product = await Product.findById(item.productId);
      if (product) {
        product.stock += Number(item.quantity);
        await product.save();
      }
    }

    res.json({ message: 'Bill updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deletePurchaseBill = async (req, res) => {
  try {
    const { billNumber } = req.params;
    const companyId = req.user.role === 'superadmin' ? req.query.companyId : req.user.companyId;

    const existingPurchases = await Purchase.find({ billNumber, companyId });
    if (!existingPurchases.length) return res.status(404).json({ message: 'Bill not found' });

    for (const ep of existingPurchases) {
      const product = await Product.findById(ep.productId);
      if (product) {
        product.stock -= Number(ep.quantity);
        await product.save();
      }
    }

    await Purchase.deleteMany({ billNumber, companyId });
    res.json({ message: 'Bill deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getGlobalSuppliers = async (req, res) => {
  try {
    const Company = require('../models/Company');
    const purchases = await Purchase.find({}, 'supplierName supplierGstin');
    const supplierMap = {};
    
    purchases.forEach(p => {
      if (p.supplierName) {
        const key = p.supplierName.trim().toLowerCase();
        if (!supplierMap[key]) {
          supplierMap[key] = {
            name: p.supplierName.trim(),
            gstin: (p.supplierGstin || '').trim()
          };
        }
      }
    });

    const companies = await Company.find({}, 'name gstin');
    companies.forEach(c => {
      if (c.name) {
        const key = c.name.trim().toLowerCase();
        if (!supplierMap[key]) {
          supplierMap[key] = {
            name: c.name.trim(),
            gstin: (c.gstin || '').trim()
          };
        } else if (!supplierMap[key].gstin && c.gstin) {
          supplierMap[key].gstin = c.gstin.trim();
        }
      }
    });

    res.json(Object.values(supplierMap));
  } catch (error) {
    console.error('GET_GLOBAL_SUPPLIERS_ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

// Returns all productIds that the current company has purchase records for.
// Used by the frontend to show 🌐 (Auto-Transfer) label for products not yet purchased.
exports.getMyPurchasedProductIds = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const purchases = await Purchase.find({ companyId }).select('productId');
    const productIds = [...new Set(purchases.map(p => p.productId?.toString()).filter(Boolean))];
    res.json(productIds);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

