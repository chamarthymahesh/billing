const Company = require('../models/Company');

const User = require('../models/User');
const bcrypt = require('bcryptjs');

exports.createCompany = async (req, res) => {
  try {
    const { adminName, adminEmail, adminPassword, ...companyData } = req.body;

    // Validate required fields
    if (!companyData.name || !companyData.address || !companyData.phone || !companyData.email) {
      return res.status(400).json({ message: 'Company name, address, phone, and email are required.' });
    }

    // Check for duplicate company email
    if (companyData.email) {
      const existingEmail = await Company.findOne({ email: companyData.email });
      if (existingEmail) {
        return res.status(409).json({ message: `A company with email "${companyData.email}" already exists.` });
      }
    }

    // Check for duplicate company name
    if (companyData.name) {
      const existingName = await Company.findOne({ name: { $regex: new RegExp(`^${companyData.name}$`, 'i') } });
      if (existingName) {
        return res.status(409).json({ message: `A company with the name "${companyData.name}" already exists.` });
      }
    }

    // Check for duplicate GSTIN
    if (companyData.gstin) {
      const existingGstin = await Company.findOne({ gstin: companyData.gstin });
      if (existingGstin) {
        return res.status(409).json({ message: `A company with GSTIN "${companyData.gstin}" already exists.` });
      }
    }

    // Check for duplicate admin email before creating anything
    if (adminEmail) {
      const existingUser = await User.findOne({ email: adminEmail });
      if (existingUser) {
        return res.status(409).json({ message: `A user with email "${adminEmail}" already exists. Please use a different admin email.` });
      }
    }

    // 1. Create the company
    const company = await Company.create(companyData);

    // 2. Create the admin user for this company
    if (adminEmail && adminPassword) {
      try {
        await User.create({
          name: adminName || company.name + ' Admin',
          email: adminEmail,
          password: adminPassword,
          role: 'companyadmin',
          companyId: company._id
        });
      } catch (userError) {
        // Rollback: delete the company if admin user creation fails
        await Company.findByIdAndDelete(company._id);
        console.error('CREATE_ADMIN_USER_ERROR (company rolled back):', userError);
        return res.status(500).json({ message: 'Company was created but admin user creation failed. Changes have been rolled back. Error: ' + userError.message });
      }
    }

    res.status(201).json(company);
  } catch (error) {
    console.error('CREATE_COMPANY_ERROR:', error);
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'field';
      return res.status(409).json({ message: `A company with this ${field} already exists.` });
    }
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
