const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');
const Company = require('../models/Company');
const fs = require('fs');
const path = require('path');

exports.generateGSTR1Report = async (req, res) => {
  try {
    let { month, year, companyId } = req.query;
    
    if (!month || !year) {
      const date = new Date();
      month = date.getMonth(); // previous month by default
      year = date.getFullYear();
      if (month === 0) {
        month = 12;
        year -= 1;
      }
    }
    
    companyId = companyId || req.user.companyId;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: 'Company not found' });
    }

    const matchQuery = {
      companyId: new mongoose.Types.ObjectId(companyId),
      date: { $gte: startDate, $lte: endDate },
      isGst: true
    };

    // Aggregate B2B (Registered Customers with GSTIN)
    const b2bInvoices = await Invoice.aggregate([
      { $match: { ...matchQuery, 'customer.gstin': { $exists: true, $ne: '' } } },
      {
        $group: {
          _id: '$customer.gstin',
          invoices: {
            $push: {
              inum: '$invoiceNumber',
              idt: { $dateToString: { format: '%d-%m-%Y', date: '$date' } },
              val: '$grandTotal',
              pos: '$customer.placeOfSupply',
              rchrg: 'N',
              inv_typ: 'R',
              items: '$items'
            }
          }
        }
      }
    ]);

    const b2b = b2bInvoices.map(customer => ({
      ctin: customer._id,
      inv: customer.invoices.map(inv => {
        // Group items by rate
        const rateGroups = {};
        inv.items.forEach(item => {
          const rate = item.gstRate || 0;
          if (!rateGroups[rate]) {
            rateGroups[rate] = { txval: 0, iamt: 0, camt: 0, samt: 0 };
          }
          rateGroups[rate].txval += item.amount || 0;
          rateGroups[rate].iamt += item.igst || 0;
          rateGroups[rate].camt += item.cgst || 0;
          rateGroups[rate].samt += item.sgst || 0;
        });

        return {
          inum: inv.inum,
          idt: inv.idt,
          val: inv.val,
          pos: inv.pos || company.state,
          rchrg: inv.rchrg,
          inv_typ: inv.inv_typ,
          itms: Object.keys(rateGroups).map((rt, index) => ({
            num: index + 1,
            itm_det: {
              rt: Number(rt),
              txval: rateGroups[rt].txval,
              iamt: rateGroups[rt].iamt,
              camt: rateGroups[rt].camt,
              samt: rateGroups[rt].samt,
              csamt: 0
            }
          }))
        };
      })
    }));

    // Aggregate B2CS (Unregistered Customers, Intra-State or Inter-State < 2.5L)
    const b2csInvoices = await Invoice.aggregate([
      { $match: { ...matchQuery, $or: [{ 'customer.gstin': { $exists: false } }, { 'customer.gstin': '' }] } },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            pos: { $ifNull: ['$customer.placeOfSupply', company.state] },
            rt: '$items.gstRate'
          },
          txval: { $sum: '$items.amount' },
          iamt: { $sum: '$items.igst' },
          camt: { $sum: '$items.cgst' },
          samt: { $sum: '$items.sgst' }
        }
      }
    ]);

    const b2cs = b2csInvoices.map(group => ({
      sply_ty: group._id.pos === company.state ? 'INTRA' : 'INTER',
      pos: group._id.pos,
      typ: 'OE',
      rt: group._id.rt || 0,
      txval: group.txval,
      iamt: group.iamt,
      camt: group.camt,
      samt: group.samt,
      csamt: 0
    }));

    // Aggregate HSN
    const hsnInvoices = await Invoice.aggregate([
      { $match: matchQuery },
      { $unwind: '$items' },
      {
        $group: {
          _id: {
            hsn_sc: '$items.hsnCode',
            desc: '$items.description'
          },
          qty: { $sum: '$items.quantity' },
          val: { $sum: '$items.total' },
          txval: { $sum: '$items.amount' },
          iamt: { $sum: '$items.igst' },
          camt: { $sum: '$items.cgst' },
          samt: { $sum: '$items.sgst' }
        }
      }
    ]);

    const hsn = {
      data: hsnInvoices.map((group, index) => ({
        num: index + 1,
        hsn_sc: group._id.hsn_sc || '',
        desc: group._id.desc || '',
        uqc: 'OTH', // default to others
        qty: group.qty,
        val: group.val,
        txval: group.txval,
        iamt: group.iamt,
        camt: group.camt,
        samt: group.samt,
        csamt: 0
      }))
    };

    const gstr1Payload = {
      gstin: company.gstin || '',
      fp: `${String(month).padStart(2, '0')}${year}`,
      gt: 0,
      cur_gt: 0,
      version: 'GST3.0.0',
      hash: 'hash',
      b2b,
      b2cs,
      hsn
    };

    // If request comes from cron, we might not have res
    if (res) {
      res.json(gstr1Payload);
    } else {
      return gstr1Payload;
    }

  } catch (error) {
    if (res) {
      res.status(500).json({ message: error.message });
    } else {
      console.error('GSTR1 Generation Error:', error);
    }
  }
};
