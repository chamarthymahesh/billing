const Invoice = require('../models/Invoice');
const Company = require('../models/Company');
const Product = require('../models/Product');
const Purchase = require('../models/Purchase');

/**
 * Calculate net profit for an invoice.
 * 
 * Formula per item:
 *   itemProfit = (sellingRate - purchaseCostPerUnit) * quantity
 * 
 * Where purchaseCostPerUnit comes from:
 *   1. The most recent purchase record for the same product (base rate + proportional other charges)
 *   2. Fallback: item.purchasePrice stored on the invoice
 * 
 * GST is EXCLUDED from profit calculation because it's a pass-through
 * (collected from customer and paid to the government).
 * 
 * Total invoice profit = sum of item profits - commission - transport charges
 */
const calculateNetInvoiceProfit = (inv, purchases, products = []) => {
  const itemProfitsSum = inv.items.reduce((sum, item) => {
    const sellingRate = Number(item.rate) || 0;
    const qty = Number(item.quantity) || 0;
    let purchaseCostPerUnit = 0;

    // Try to find a matching purchase record for this product
    if (item.productId) {
      const itemProdId = item.productId.toString();
      // Find all purchases for this product, pick the most recent one
      const matchingPurchases = purchases.filter(p =>
        p.productId && 
        p.productId.toString() === itemProdId &&
        (!p.companyId || !inv.companyId || p.companyId.toString() === inv.companyId.toString())
      );

      if (matchingPurchases.length > 0) {
        // Sort by purchaseDate descending, use the latest purchase for cost basis
        const latestPurchase = matchingPurchases.sort((a, b) =>
          new Date(b.purchaseDate || b.createdAt) - new Date(a.purchaseDate || a.createdAt)
        )[0];

        if (latestPurchase.quantity > 0) {
          // Base cost per unit from purchase (subTotal / qty = rate already, but subTotal is accurate)
          const unitBase = latestPurchase.subTotal / latestPurchase.quantity;

          // Proportional other charges per unit
          const otherCharges = (Number(latestPurchase.packagingCharges) || 0) +
                               (Number(latestPurchase.transportCharges) || 0) +
                               (Number(latestPurchase.miscCharges) || 0);
          const unitOther = otherCharges / latestPurchase.quantity;

          purchaseCostPerUnit = unitBase + unitOther;
        }
      }
    }

    // Fallback: use purchasePrice stored on the invoice item
    if (purchaseCostPerUnit === 0) {
      purchaseCostPerUnit = Number(item.purchasePrice) || 0;
    }

    // Ultimate Fallback: use Product's base purchasePrice or price
    if (purchaseCostPerUnit === 0 && products.length > 0) {
      const prod = products.find(p => p._id.toString() === item.productId?.toString());
      if (prod) {
        purchaseCostPerUnit = Number(prod.purchasePrice) || Number(prod.price) || 0;
      }
    }

    // Item profit = (selling rate - purchase cost) * quantity
    const itemProfit = (sellingRate - purchaseCostPerUnit) * qty;

    return sum + itemProfit;
  }, 0);

  // Subtract invoice-level deductions
  const commission = Number(inv.commission) || 0;
  const transportCharges = Number(inv.transportCharges) || 0;
  const adjustment = Number(inv.adjustment) || 0;

  return itemProfitsSum - commission - transportCharges + adjustment;
};

exports.calculateNetInvoiceProfit = calculateNetInvoiceProfit;

exports.createInvoice = async (req, res) => {
  try {
    const { companyId, items, transportCharges, commission, isGst, adjustment } = req.body;
    
    // Fetch company to get next invoice number
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    // ------- Auto-Transfer Logic for Cross-Company Products -------
    const allProductsInRequest = await Product.find({ _id: { $in: items.map(it => it.productId).filter(Boolean) } });
    
    for (let i = 0; i < items.length; i++) {
      let item = items[i];
      if (!item.productId) continue;
      
      let sourceProd = allProductsInRequest.find(p => p._id.toString() === item.productId.toString());
      if (sourceProd && sourceProd.companyId && sourceProd.companyId.toString() !== companyId.toString()) {
        const sourceCompanyId = sourceProd.companyId;
        const sourceCompany = await Company.findById(sourceCompanyId);
        
        // 1. Clone product to current (target) company if it doesn't exist
        let targetProd = await Product.findOne({
          companyId: companyId,
          name: sourceProd.name,
          brand: sourceProd.brand
        });
        
        if (!targetProd) {
          targetProd = await Product.create({
            name: sourceProd.name,
            brand: sourceProd.brand,
            productType: sourceProd.productType,
            sku: sourceProd.sku ? sourceProd.sku + '-' + companyId.toString().substring(0,4) : undefined,
            price: sourceProd.price,
            purchasePrice: sourceProd.purchasePrice,
            gstRate: sourceProd.gstRate,
            hsnCode: sourceProd.hsnCode,
            companyId: companyId,
            stock: 0
          });
        }
        
        // Update item.productId to point to local clone
        item.productId = targetProd._id.toString();
        
        // 2. Generate Sales Invoice in Source Company
        const salesInvoiceNumber = `${sourceCompany.settings.invoicePrefix}/${sourceCompany.settings.fyPrefix}/${String(sourceCompany.settings.nextInvoiceNumber).padStart(3, '0')}`;
        const transferQty = Number(item.quantity);
        const transferRate = Number(sourceProd.purchasePrice) || Number(sourceProd.price) || 0;
        const transferAmount = transferQty * transferRate;
        const transferGst = (transferAmount * (sourceProd.gstRate || 0)) / 100;
        
        await Invoice.create({
          companyId: sourceCompanyId,
          invoiceNumber: salesInvoiceNumber,
          date: new Date(),
          isGst: true,
          customer: {
            name: company.name,
            address: company.address || '',
            gstin: company.gstin || '',
            state: company.state || '',
            placeOfSupply: company.state || ''
          },
          items: [{
            productId: sourceProd._id,
            description: sourceProd.name,
            hsnCode: sourceProd.hsnCode,
            quantity: transferQty,
            rate: transferRate,
            gstRate: sourceProd.gstRate,
            amount: transferAmount,
            total: transferAmount + transferGst
          }],
          subTotal: transferAmount,
          totalGst: transferGst,
          grandTotal: transferAmount + transferGst,
          totalProfit: 0,
          stockDeficit: (sourceProd.stock || 0) - transferQty < 0
        });
        
        sourceCompany.settings.nextInvoiceNumber += 1;
        await sourceCompany.save();
        
        sourceProd.stock = (sourceProd.stock || 0) - transferQty;
        await sourceProd.save();
        
        // 3. Generate Purchase Bill in Target Company
        await Purchase.create({
          companyId: companyId,
          billNumber: salesInvoiceNumber,
          supplierName: sourceCompany.name,
          supplierGstin: sourceCompany.gstin,
          purchaseDate: new Date(),
          productId: targetProd._id,
          quantity: transferQty,
          rate: transferRate,
          gstRate: sourceProd.gstRate || 0,
          isGst: true,
          paymentStatus: 'Paid',
          subTotal: transferAmount,
          totalGst: transferGst,
          totalAmount: transferAmount + transferGst
        });
        
        targetProd.stock = (targetProd.stock || 0) + transferQty;
        await targetProd.save();
      }
    }
    // --------------------------------------------------------------

    // ------- Purchase validation & Auto-Creation -------
    // Ensure every product in the invoice has at least one purchase record for this company
    const productIds = items.map(it => it.productId).filter(Boolean);
    if (productIds.length > 0) {
      const purchases = await Purchase.find({
        companyId: companyId,
        productId: { $in: productIds }
      }).select('productId');
      const purchasedSet = new Set(purchases.map(p => p.productId?.toString()));
      
      const missingIds = [...new Set(productIds.map(pid => pid.toString()))].filter(pid => !purchasedSet.has(pid));
      
      if (missingIds.length > 0) {
        const allProducts = await Product.find({ _id: { $in: missingIds } });
        const prodMap = {};
        allProducts.forEach(p => { prodMap[p._id.toString()] = p; });

        for (const pid of missingIds) {
          const prod = prodMap[pid];
          if (!prod) continue;
          
          const billedQty = items.filter(it => it.productId?.toString() === pid).reduce((sum, it) => sum + Number(it.quantity || 0), 0);
          
          let rate = prod.purchasePrice || prod.price || 0;
          let supplierName = 'Auto Generated';
          let supplierGstin = '';

          // Strategy 0: Check if another company has this exact product WITH ENOUGH STOCK to transfer
          const sourceProductWithStock = await Product.findOne({
            name: { $regex: new RegExp(`^${prod.name}$`, 'i') },
            companyId: { $nin: [null, companyId] },
            stock: { $gte: billedQty }
          }).populate('companyId', 'name gstin');

          if (sourceProductWithStock) {
            supplierName = sourceProductWithStock.companyId?.name || 'Auto Transfer';
            // Capture GSTIN if available on the source company's record
            supplierGstin = sourceProductWithStock.companyId?.gstin || '';
            rate = sourceProductWithStock.purchasePrice || sourceProductWithStock.price || rate;
            
            // Deduct stock from the source company (Real Stock Transfer)
            sourceProductWithStock.stock -= billedQty;
            await sourceProductWithStock.save();
          } else {
            // No company has enough stock — look for the most recent REAL purchase
            // for THIS specific company's product only (not cross-company)
            const existingPurchase = await Purchase.findOne({
              productId: pid,
              companyId: companyId,
              supplierName: { $nin: ['Auto Generated', 'Auto Transfer', ''] },
              rate: { $gt: 0 }
            }).sort({ purchaseDate: -1 });

            if (existingPurchase) {
              // Use rate and supplier from the real historical purchase for THIS company
              rate = existingPurchase.rate;
              supplierName = existingPurchase.supplierName;
              supplierGstin = existingPurchase.supplierGstin || '';
            } else {
              // Last resort: find any source company that has this product with a price
              const productWithPrice = await Product.findOne({
                name: { $regex: new RegExp(`^${prod.name}$`, 'i') },
                companyId: { $nin: [null, companyId] },
                $or: [
                  { purchasePrice: { $gt: 0 } },
                  { price: { $gt: 0 } }
                ]
              }).sort({ updatedAt: -1 }).populate('companyId', 'name gstin');

              if (productWithPrice) {
                rate = productWithPrice.purchasePrice || productWithPrice.price || rate;
                supplierName = productWithPrice.companyId?.name || 'Auto Transfer';
                supplierGstin = productWithPrice.companyId?.gstin || '';
              } else {
                // No source found at all
                supplierName = 'Auto Transfer';
              }
            }
          }
          
          const subTotal = billedQty * rate;
          const gstAmount = (subTotal * (prod.gstRate || 0)) / 100;
          const totalAmount = subTotal + gstAmount;
          
          await Purchase.create({
            companyId: companyId,
            productId: pid,
            supplierName: supplierName,
            supplierGstin: supplierGstin,
            billNumber: `AUTO-PUR-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            purchaseDate: new Date(),
            quantity: billedQty,
            rate: rate,
            gstRate: prod.gstRate || 0,
            subTotal: subTotal,
            totalGst: gstAmount,
            totalAmount: totalAmount,
            isGst: (prod.gstRate || 0) > 0,
            paymentStatus: 'Paid'
          });
          // Update product stock ONLY if we actually needed it (i.e. we were deficient)
          // If we already had artificial stock (e.g. 80), we just created a purchase record to balance the books,
          // but we shouldn't double-count the stock.
          const actualDeficit = billedQty - Math.max(prod.stock || 0, 0);
          if (actualDeficit > 0) {
            prod.stock = (prod.stock || 0) + actualDeficit;
            await prod.save();
          }
        }
      }

      // --- Also handle products that HAVE purchase records but INSUFFICIENT STOCK ---
      // NOTE: Do NOT filter by companyId here — the productId from the invoice items
      // may belong to a different company's product record. We find by ID only.
      const allInvoiceProducts = await Product.find({ _id: { $in: productIds } }).populate('companyId', 'name gstin');
      console.log('🔍 Checking', allInvoiceProducts.length, 'products for stock deficit');
      for (const prod of allInvoiceProducts) {
        const pid = prod._id.toString();
        // Skip products already handled by the missingIds block above
        if (missingIds.includes(pid)) continue;

        const billedQty = items.filter(it => it.productId?.toString() === pid)
          .reduce((sum, it) => sum + Number(it.quantity || 0), 0);

        console.log(`📦 ${prod.name}: stock=${prod.stock}, billedQty=${billedQty}`);

        if ((prod.stock || 0) < billedQty) {
          // Need more stock — check if another company has it
          const deficit = billedQty - Math.max(prod.stock || 0, 0);
          console.log(`⚡ Deficit detected for ${prod.name}: need ${deficit} more units`);

          // The product may belong to Virat (different company). Search other companies for stock.
          const prodCompanyId = prod.companyId?._id?.toString() || prod.companyId?.toString();
          const excludeIds = [null, companyId, prodCompanyId].filter(Boolean);
          const sourceProductWithStock = await Product.findOne({
            name: { $regex: new RegExp(`^${prod.name}$`, 'i') },
            companyId: { $nin: excludeIds },
            stock: { $gte: deficit }
          }).populate('companyId', 'name gstin');

          // If no other company has it, check if the product itself (Virat's) has stock
          const finalSource = sourceProductWithStock || (
            prod.stock >= deficit ? prod : null
          );

          if (finalSource) {
            console.log('🔎 Source found for transfer:', finalSource._id, 'Company:', finalSource.companyId?.name || finalSource.companyId, 'stock before:', finalSource.stock);
            let rate = finalSource.purchasePrice || finalSource.price || prod.purchasePrice || prod.price || 0;
            if (!rate || rate <= 0) rate = 1; // fallback so Purchase.create doesn't fail
            const supplierCompanyId = finalSource.companyId?._id || finalSource.companyId;
            const supplierName = finalSource.companyId?.name || 'Auto Transfer';
            const supplierGstin = finalSource.companyId?.gstin || '';

            // Deduct stock from source (Virat)
            finalSource.stock -= deficit;
            await finalSource.save();
            console.log('✅ Deducted', deficit, 'from source. New source stock:', finalSource.stock);

            const subTotal = deficit * rate;
            const gstAmount = (subTotal * (prod.gstRate || 0)) / 100;
            const totalAmount = subTotal + gstAmount;

            // Find or create the matching product in Sithara (target company)
            let targetProduct = await Product.findOne({ name: prod.name, companyId: companyId });
            if (!targetProduct) {
              targetProduct = await Product.create({
                name: prod.name,
                brand: prod.brand,
                productType: prod.productType,
                price: prod.price,
                purchasePrice: prod.purchasePrice,
                gstRate: prod.gstRate,
                hsnCode: prod.hsnCode,
                companyId: companyId,
                stock: 0
              });
              console.log('✅ Created target product in Sithara:', targetProduct._id);
            }

            console.log('Creating purchase record: qty', deficit, 'rate', rate, 'for company', companyId);
            await Purchase.create({
              companyId: companyId,
              productId: targetProduct._id,
              supplierName: supplierName,
              supplierGstin: supplierGstin,
              billNumber: `AUTO-TRANSFER-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
              purchaseDate: new Date(),
              quantity: deficit,
              rate: rate,
              gstRate: prod.gstRate || 0,
              subTotal: subTotal,
              totalGst: gstAmount,
              totalAmount: totalAmount,
              isGst: (prod.gstRate || 0) > 0,
              paymentStatus: 'Paid'
            });
            console.log('✅ Purchase record created for transfer to Sithara');

            // Add transferred stock to Sithara's product
            targetProduct.stock = (targetProduct.stock || 0) + deficit;
            await targetProduct.save();
            console.log('✅ Sithara product stock updated, new stock:', targetProduct.stock);
          } else {
            console.warn('⚠️ No source with sufficient stock found for', prod.name, '— needed', deficit, 'units');
          }
        }
      }
      // ---------------------------------------------------------------
    }
    // ---------------------------------------------------

    const invoiceNumber = `${company.settings.invoicePrefix}/${company.settings.fyPrefix}/${String(company.settings.nextInvoiceNumber).padStart(3, '0')}`;
    
    const isInterState = company.state?.trim().toLowerCase() !== (req.body.customer?.placeOfSupply || req.body.customer?.state)?.trim().toLowerCase();
    
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

    // Compute total profit including transport and commission deductions
    totalProfit = totalProfit - (Number(transportCharges) || 0) - (Number(commission) || 0);
    // Include transport charges in the grand total calculation
    const grandTotal = subTotal + totalGst + (Number(adjustment) || 0);

    let stockDeficit = false;
    const invoice = await Invoice.create({
      ...req.body,
      invoiceNumber,
      items: processedItems,
      subTotal,
      totalGst,
      grandTotal,
      totalProfit,
      stockDeficit: false // default, will update if needed
    });

    // Adjust product stock based on invoice items (allow negative stock)
    for (const item of items) {
      const prod = await Product.findById(item.productId);
      if (prod) {
        prod.stock = (prod.stock || 0) - Number(item.quantity);
        await prod.save();
        if (prod.stock < 0) stockDeficit = true;
      }
    }

    if (stockDeficit) {
      await Invoice.findByIdAndUpdate(invoice._id, { stockDeficit: true });
      
      // If deficit, upsert a record in DeficitCompany for this company
      const DeficitCompany = require('../models/DeficitCompany');
      await DeficitCompany.updateOne(
        { companyId },
        { $set: { lastDeficitAt: new Date() } },
        { upsert: true }
      );
    }

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
    const isAdminLike = req.user.role === 'superadmin' || req.user.role === 'manager';
    const filter = isAdminLike ? {} : { companyId: req.user.companyId };
    const invoices = await Invoice.find(filter).populate('companyId', 'name').sort({ date: -1, createdAt: -1 });
    
    const Purchase = require('../models/Purchase');
    const purchases = await Purchase.find(filter);
    const products = await Product.find(filter);
    
    const processedInvoices = invoices.map(inv => {
      const plainInv = inv.toObject();
      plainInv.totalProfit = calculateNetInvoiceProfit(inv, purchases, products);
      return plainInv;
    });

    res.json(processedInvoices);
  } catch (error) {
    console.error('GET_INVOICES_ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getInvoiceById = async (req, res) => {
  try {
    const invoice = await Invoice.findById(req.params.id).populate('companyId');
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    
    const Purchase = require('../models/Purchase');
    const isAdminLike = req.user.role === 'superadmin' || req.user.role === 'manager';
    const filter = isAdminLike ? {} : { companyId: req.user.companyId };
    const purchases = await Purchase.find(filter);
    const products = await Product.find(filter);
    
    const plainInv = invoice.toObject();
    plainInv.totalProfit = calculateNetInvoiceProfit(invoice, purchases, products);

    res.json(plainInv);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getReports = async (req, res) => {
  try {
    const isAdminLike = req.user.role === 'superadmin' || req.user.role === 'manager';
    const filter = isAdminLike ? {} : { companyId: req.user.companyId };
    const invoices = await Invoice.find(filter);
    
    const Purchase = require('../models/Purchase');
    const purchases = await Purchase.find(filter);
    const products = await Product.find(filter);

    // Calculate total net profit for each invoice using helper
    const calculatedTotalProfit = invoices.reduce((sum, inv) => sum + calculateNetInvoiceProfit(inv, purchases, products), 0);

    const stats = {
      totalSales: invoices.reduce((sum, inv) => sum + inv.grandTotal, 0),
      totalGst: invoices.reduce((sum, inv) => sum + (inv.totalGst || 0), 0),
      totalCommission: invoices.reduce((sum, inv) => sum + (inv.commission || 0), 0),
      totalTransport: invoices.reduce((sum, inv) => sum + (inv.transportCharges || 0), 0),
      count: invoices.length,
      
      // P&L Data
      totalPurchases: purchases.reduce((sum, p) => sum + p.totalAmount, 0),
      purchaseGst: purchases.reduce((sum, p) => sum + (p.totalGst || 0), 0),
      totalProfit: calculatedTotalProfit,
      
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
    const { items, transportCharges, commission, isGst, adjustment } = req.body;
    
    const company = await Company.findById(req.body.companyId);
    if (!company) return res.status(404).json({ message: 'Company not found' });

    const isInterState = company.state?.trim().toLowerCase() !== (req.body.customer?.placeOfSupply || req.body.customer?.state)?.trim().toLowerCase();
    
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

    // Compute total profit including transport and commission deductions
    totalProfit = totalProfit - (Number(transportCharges) || 0) - (Number(commission) || 0);
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
    const invoice = await Invoice.findById(req.params.id);
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

    // Restore stock for all products in this invoice
    if (invoice.items && invoice.items.length > 0) {
      const Product = require('../models/Product');
      for (const item of invoice.items) {
        if (item.productId) {
          const product = await Product.findById(item.productId);
          if (product) {
            product.stock = (product.stock || 0) + (item.quantity || 0);
            await product.save();
          }
        }
      }
    }

    await Invoice.findByIdAndDelete(req.params.id);
    res.json({ message: 'Invoice deleted successfully (stock restored)' });
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

exports.getDetailedReports = async (req, res) => {
  try {
    const Company = require('../models/Company');
    const Invoice = require('../models/Invoice');
    const Purchase = require('../models/Purchase');
    
    const companies = await Company.find();
    const invoices = await Invoice.find();
    const purchases = await Purchase.find().populate('productId', 'name sku');
    
    const detailedReports = companies.map(comp => {
      const compInvoices = invoices.filter(inv => inv.companyId.toString() === comp._id.toString());
      const compPurchases = purchases.filter(pur => pur.companyId.toString() === comp._id.toString());
      
      return {
        _id: comp._id,
        name: comp.name,
        gstin: comp.gstin,
        totals: {
          sales: compInvoices.reduce((sum, inv) => sum + (inv.grandTotal || 0), 0),
          profit: compInvoices.reduce((sum, inv) => sum + calculateNetInvoiceProfit(inv, purchases), 0),
          transport: compInvoices.reduce((sum, inv) => sum + (inv.transportCharges || 0), 0),
          commission: compInvoices.reduce((sum, inv) => sum + (inv.commission || 0), 0),
          purchases: compPurchases.reduce((sum, p) => sum + (p.totalAmount || 0), 0)
        },
        invoices: compInvoices.map(inv => ({
          _id: inv._id,
          invoiceNumber: inv.invoiceNumber,
          date: inv.date,
          customerName: inv.customer?.name,
          grandTotal: inv.grandTotal || 0,
          totalProfit: calculateNetInvoiceProfit(inv, purchases),
          transportCharges: inv.transportCharges || 0,
          commission: inv.commission || 0
        })).sort((a, b) => new Date(b.date) - new Date(a.date)),
        purchases: compPurchases.map(p => ({
          _id: p._id,
          billNumber: p.billNumber,
          supplierName: p.supplierName,
          date: p.purchaseDate,
          totalAmount: p.totalAmount || 0,
          productName: p.productId?.name || 'Unknown Product',
          purchasePrice: p.rate || 0,
          quantity: p.quantity || 0
        })).sort((a, b) => new Date(b.date) - new Date(a.date))
      };
    });
    
    res.json(detailedReports);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateMaterialDeliveryStatus = async (req, res) => {
  try {
    const status = req.body.materialDeliveryStatus || req.body.status;
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.id,
      { materialDeliveryStatus: status },
      { new: true }
    );
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json(invoice);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getDeficitCompanies = async (req, res) => {
  try {
    // Only superadmin can view deficit companies
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    const DeficitCompany = require('../models/DeficitCompany');
    const deficitCompanies = await DeficitCompany.find().populate('companyId', 'name gstin');
    const result = deficitCompanies.map(dc => ({
      companyId: dc.companyId._id,
      companyName: dc.companyId.name,
      gstin: dc.companyId.gstin,
      lastDeficitAt: dc.lastDeficitAt
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Return all unique customers across all invoices (for superadmin global dropdowns)
exports.getGlobalCustomers = async (req, res) => {
  try {
    const invoices = await Invoice.find({}, 'customer');
    const customerMap = {};
    invoices.forEach(inv => {
      if (inv.customer && inv.customer.name) {
        const key = inv.customer.name.trim().toLowerCase();
        if (!customerMap[key]) {
          customerMap[key] = {
            name: inv.customer.name,
            phone: inv.customer.phone || '',
            address: inv.customer.address || '',
            gstin: inv.customer.gstin || '',
            state: inv.customer.state || '',
            placeOfSupply: inv.customer.placeOfSupply || ''
          };
        }
      }
    });
    res.json(Object.values(customerMap));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};




