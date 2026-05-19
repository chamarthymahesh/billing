const Invoice = require('../models/Invoice');
const Company = require('../models/Company');

exports.createInvoice = async (req, res) => {
  try {
    const { companyId, items, transportCharges, commission, isGst, adjustment } = req.body;
    
    // Fetch company to get next invoice number
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const invoiceNumber = `${company.settings.invoicePrefix}/${company.settings.fyPrefix}/${String(company.settings.nextInvoiceNumber).padStart(3, '0')}`;
    
    const isInterState = company.state?.toLowerCase() !== (req.body.customer?.placeOfSupply || req.body.customer?.state)?.toLowerCase();
    
    // Calculate totals
    let subTotal = 0;
    let totalGst = 0;
    let totalProfit = 0;

    const processedItems = items.map(item => {
      const amount = item.quantity * item.rate;
      const purchaseP = Number(item.purchasePrice) || 0;
      const itemProfit = (item.rate - purchaseP) * item.quantity;
      
      subTotal += amount;
      totalProfit += itemProfit;
      
      let itemGst = 0;
      let cgst = 0, sgst = 0, igst = 0;

      if (isGst) {
        itemGst = (amount * item.gstRate) / 100;
        totalGst += itemGst;
        
        if (isInterState) {
          igst = itemGst;
        } else {
          cgst = itemGst / 2;
          sgst = itemGst / 2;
        }
      }

      return {
        ...item,
        purchasePrice: purchaseP,
        profit: itemProfit,
        amount,
        cgst,
        sgst,
        igst,
        total: amount + itemGst
      };
    });

    // We can also subtract commission from the overall profit if it applies to the invoice
    // totalProfit -= (Number(commission) || 0); // Deciding to keep Gross Profit on items vs Net Profit. Let's just track item profit for now.
    
    const grandTotal = subTotal + totalGst + (Number(adjustment) || 0);

    const invoice = await Invoice.create({
      ...req.body,
      invoiceNumber,
      items: processedItems,
      subTotal,
      totalGst,
      grandTotal,
      totalProfit
    });

    // Increment company invoice number
    company.settings.nextInvoiceNumber += 1;
    await company.save();

    res.status(201).json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getInvoices = async (req, res) => {
  try {
    const filter = req.user.role === 'superadmin' ? {} : { companyId: req.user.companyId };
    const invoices = await Invoice.find(filter).populate('companyId', 'name').sort({ date: -1, createdAt: -1 });
    res.json(invoices);
  } catch (error) {
    console.error('GET_INVOICES_ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('companyId');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getReports = async (req, res) => {
  try {
    const filter = req.user.role === 'superadmin' ? {} : { companyId: req.user.companyId };
    const invoices = await Invoice.find(filter);
    
    const Purchase = require('../models/Purchase');
    const purchases = await Purchase.find(filter);

    const stats = {
      totalSales: invoices.reduce((sum, inv) => sum + inv.grandTotal, 0),
      totalGst: invoices.reduce((sum, inv) => sum + (inv.totalGst || 0), 0),
      totalCommission: invoices.reduce((sum, inv) => sum + (inv.commission || 0), 0),
      totalTransport: invoices.reduce((sum, inv) => sum + (inv.transportCharges || 0), 0),
      count: invoices.length,
      
      // P&L Data
      totalPurchases: purchases.reduce((sum, p) => sum + p.totalAmount, 0),
      purchaseGst: purchases.reduce((sum, p) => sum + (p.totalGst || 0), 0),
      totalProfit: invoices.reduce((sum, inv) => sum + (inv.totalProfit || 0), 0),
      
      // Customer Commission breakdown
      customerCommissionList: Object.entries(invoices.reduce((acc, inv) => {
        if (inv.commission > 0) {
          const name = inv.customer?.name || 'Unknown';
          acc[name] = (acc[name] || 0) + inv.commission;
        }
        return acc;
      }, {})).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total),

      // GSTR-1 Breakdowns
      gstr1: {
        b2b: invoices.filter(inv => inv.isGst && inv.customer?.gstin).map(inv => ({
          gstin: inv.customer.gstin,
          name: inv.customer.name,
          invoiceNo: inv.invoiceNumber,
          date: inv.date,
          taxableValue: inv.subTotal,
          totalGst: inv.totalGst,
          state: inv.customer.state
        })),
        b2c: invoices.filter(inv => inv.isGst && !inv.customer?.gstin).reduce((acc, inv) => {
          const state = inv.customer?.state || 'Other';
          if (!acc[state]) acc[state] = { taxable: 0, tax: 0 };
          acc[state].taxable += inv.subTotal;
          acc[state].tax += inv.totalGst;
          return acc;
        }, {}),
        hsnSummary: invoices.reduce((acc, inv) => {
          inv.items.forEach(item => {
            const hsn = item.hsnCode || 'N/A';
            if (!acc[hsn]) acc[hsn] = { hsn, qty: 0, taxable: 0, tax: 0 };
            acc[hsn].qty += item.quantity;
            acc[hsn].taxable += item.amount;
            acc[hsn].tax += (item.amount * (item.gstRate || 0)) / 100;
          });
          return acc;
        }, {})
      }
    };
    
    res.json(stats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.updateCommissionStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id, 
      { commissionStatus: status }, 
      { new: true }
    );
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updatePaymentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id, 
      { status }, 
      { new: true }
    );
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getGlobalReports = async (req, res) => {
  try {
    const companies = await Company.find({ isActive: true });
    const invoices = await Invoice.find({});
    
    const reports = companies.map(comp => {
      const compInvoices = invoices.filter(inv => inv.companyId.toString() === comp._id.toString());
      return {
        _id: comp._id,
        name: comp.name,
        gstin: comp.gstin,
        totalSales: compInvoices.reduce((sum, inv) => sum + inv.grandTotal, 0),
        totalGst: compInvoices.reduce((sum, inv) => sum + (inv.totalGst || 0), 0),
        invoiceCount: compInvoices.length,
        status: comp.isActive ? 'Active' : 'Inactive'
      };
    });
    
    res.json(reports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCommissionDetails = async (req, res) => {
  try {
    const { commission, commissionStatus } = req.body;
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id, 
      { commission: Number(commission), commissionStatus }, 
      { new: true }
    );
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateInvoice = async (req, res) => {
  try {
    const { items, transportCharges, isGst, adjustment } = req.body;
    
    const company = await Company.findById(req.body.companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const isInterState = company.state?.toLowerCase() !== (req.body.customer?.placeOfSupply || req.body.customer?.state)?.toLowerCase();
    
    // Calculate totals
    let subTotal = 0;
    let totalGst = 0;
    let totalProfit = 0;

    const processedItems = items.map(item => {
      const amount = item.quantity * item.rate;
      const purchaseP = Number(item.purchasePrice) || 0;
      const itemProfit = (item.rate - purchaseP) * item.quantity;
      
      subTotal += amount;
      totalProfit += itemProfit;
      
      let itemGst = 0;
      let cgst = 0, sgst = 0, igst = 0;

      if (isGst) {
        itemGst = (amount * item.gstRate) / 100;
        totalGst += itemGst;
        
        if (isInterState) {
          igst = itemGst;
        } else {
          cgst = itemGst / 2;
          sgst = itemGst / 2;
        }
      }

      return {
        ...item,
        purchasePrice: purchaseP,
        profit: itemProfit,
        amount,
        cgst,
        sgst,
        igst,
        total: amount + itemGst
      };
    });

    const grandTotal = subTotal + totalGst + (Number(adjustment) || 0);

    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        items: processedItems,
        subTotal,
        totalGst,
        grandTotal,
        totalProfit
      },
      { new: true }
    );

    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteInvoice = async (req, res) => {
  try {
    const invoice = await Invoice.findByIdAndDelete(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateTransportDetails = async (req, res) => {
  try {
    const { transportCharges, transportStatus } = req.body;
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id, 
      { transportCharges: Number(transportCharges), transportStatus }, 
      { new: true }
    );
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
