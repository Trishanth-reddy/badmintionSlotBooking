const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  // Allow 10-15 digits (flexible for international codes if needed later)
  const phoneRegex = /^[0-9]{10,15}$/;
  return phoneRegex.test(phone.replace(/\D/g, ''));
};

const validatePassword = (password) => {
  return password && password.length >= 8;
};

// Middleware for REGISTRATION
const validateRegister = (req, res, next) => {
  let { email, phone, password, fullName } = req.body;

  // Sanitize inputs
  if (fullName) req.body.fullName = fullName.trim();
  if (email) req.body.email = email.trim().toLowerCase();
  if (phone) req.body.phone = phone.trim();

  // Validate Full Name
  if (!req.body.fullName || req.body.fullName.length < 2) {
    return res.status(400).json({ message: 'Full name is required' });
  }

  // Validate Email
  if (!req.body.email || !validateEmail(req.body.email)) {
    return res.status(400).json({ message: 'Valid email is required' });
  }

  // Validate Phone
  if (!req.body.phone || !validatePhone(req.body.phone)) {
    return res.status(400).json({ message: 'Valid 10-digit phone number is required' });
  }

  // Validate Password
  if (!validatePassword(password)) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  next();
};

// Middleware for LOGIN
const validateLogin = (req, res, next) => {
  let { email, password } = req.body;

  // Sanitize
  if (email) req.body.email = email.trim().toLowerCase();

  if (!req.body.email || !validateEmail(req.body.email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }

  if (!password) {
    return res.status(400).json({ message: 'Password is required' });
  }

  next();
};

module.exports = {
  validateRegister,
  validateLogin
};