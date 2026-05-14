const User = require('../models/User');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.registerUser = async (req, res) => {
  const { name, email, password, role, companyId } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({ name, email, password, role, companyId });
    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      companyId: user.companyId,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;
  
  // Admin Bypass
  if (email.toLowerCase() === 'admin@billpro.com' && password === 'admin123') {
    return res.json({
      _id: 'dev_admin_id',
      name: 'Super Admin (Dev)',
      email: 'admin@billpro.com',
      role: 'superadmin',
      companyId: null,
      token: jwt.sign({ id: 'dev_admin_id' }, process.env.JWT_SECRET, { expiresIn: '30d' }),
    });
  }

  // Company Bypass (For Testing)
  if (email.toLowerCase() === 'company@billpro.com' && password === 'company123') {
    return res.json({
      _id: 'dev_company_id',
      name: 'Company Admin (Dev)',
      email: 'company@billpro.com',
      role: 'companyadmin',
      companyId: '6a04a66def3d7c0b2820aaa7', // Demo Company ID
      token: jwt.sign({ id: 'dev_company_id' }, process.env.JWT_SECRET, { expiresIn: '30d' }),
    });
  }

  try {
    const user = await User.findOne({ email });
    if (user && (await user.comparePassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
