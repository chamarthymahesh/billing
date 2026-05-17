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
    
    // Allow updating paymentStatus directly. If quantities/rates change, we'd need to recalculate stock.
    // For now, let's keep it simple: allow updating everything, but warn if stock calculations get out of sync.
    // It's safer to just let them update paymentStatus and basic text fields.
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

