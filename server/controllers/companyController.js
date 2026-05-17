const Company = require('../models/Company');

const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.createCompany = async (req, res) => {
  try {
    const { adminName, adminEmail, adminPassword, ...companyData } = req.body;
    
    // 1. Create the company
    const company = await Company.create(companyData);
    
    // 2. Create the admin user for this company
    if (adminEmail && adminPassword) {
      await User.create({
        name: adminName || company.name + ' Admin',
        email: adminEmail,
        password: adminPassword,
        role: 'companyadmin',
        companyId: company._id
      });
    }
    
    res.status(201).json(company);
  } catch (error) {
    console.error('CREATE_COMPANY_ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.getCompanies = async (req, res) => {
  try {
    const companies = await Company.find();
    res.json(companies);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json(company);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(company);
  } catch (error) {
    console.error('UPDATE_COMPANY_ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteCompany = async (req, res) => {
  try {
    const company = await Company.findByIdAndDelete(req.params.id);
    if (!company) return res.status(404).json({ message: 'Company not found' });
    
    // Delete associated users
    await User.deleteMany({ companyId: req.params.id });
    
    res.json({ message: 'Company deleted successfully' });
  } catch (error) {
    console.error('DELETE_COMPANY_ERROR:', error);
    res.status(500).json({ message: error.message });
  }
};
