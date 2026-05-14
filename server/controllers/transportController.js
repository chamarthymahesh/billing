const Transport = require('../models/Transport');

exports.createTransport = async (req, res) => {
  try {
    const record = new Transport({ ...req.body, companyId: req.user.companyId });
    await record.save();
    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getTransportRecords = async (req, res) => {
  try {
    const records = await Transport.find({ companyId: req.user.companyId })
      .populate('invoiceId', 'invoiceNumber customer.name')
      .sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteTransportRecord = async (req, res) => {
  try {
    await Transport.findByIdAndDelete(req.params.id);
    res.json({ message: 'Record deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
