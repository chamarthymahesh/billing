const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Bypass database check for Dev IDs
      if (decoded.id === 'dev_admin_id') {
        req.user = { _id: 'dev_admin_id', name: 'Super Admin (Dev)', role: 'superadmin' };
        return next();
      }
      if (decoded.id === 'dev_company_id') {
        req.user = { 
          _id: 'dev_company_id', 
          name: 'Company Admin (Dev)', 
          role: 'companyadmin',
          companyId: '6a04a66def3d7c0b2820aaa7' 
        };
        return next();
      }

      const user = await User.findById(decoded.id).select('-password');
      if (!user) return res.status(401).json({ message: 'User not found, unauthorized' });
      req.user = user;
      return next();
    } catch (error) {
      return res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }
  
  if (!token) {
    return res.status(401).json({ message: 'Not authorized, no token' });
  }
};

const superAdminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    res.status(403).json({ message: 'Super Admin access required' });
  }
};

module.exports = { protect, superAdminOnly };
