const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePhone = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length === 10;
};

const validatePassword = (password) => {
  return password && password.length >= 8;
};

// Middleware for REGISTRATION
const validateRegister = (req, res, next) => {
  try {
    let { email, phone, password, fullName } = req.body;

    // 1. Safety Check: Ensure body exists
    if (!req.body) {
      return res.status(400).json({ message: 'Request body is missing' });
    }

    // 2. Sanitize inputs (with null checks to prevent crashes)
    req.body.fullName = fullName ? fullName.trim() : "";
    req.body.phone = phone ? phone.replace(/\D/g, '') : "";
    req.body.email = email ? email.trim().toLowerCase() : undefined;

    // 3. Validate Full Name
    if (!req.body.fullName || req.body.fullName.length < 2) {
      return res.status(400).json({ message: 'Full name is required (min 2 chars)' });
    }

    // 4. Validate Phone (Mandatory)
    if (!req.body.phone || !validatePhone(req.body.phone)) {
      return res.status(400).json({ message: 'A valid 10-digit phone number is required' });
    }

    // 5. Validate Email (Optional)
    if (req.body.email && req.body.email !== "") {
      if (!validateEmail(req.body.email)) {
        return res.status(400).json({ message: 'Please enter a valid email address' });
      }
    } else {
      req.body.email = undefined; // Force undefined for MongoDB sparse index
    }

    // 6. Validate Password
    if (!validatePassword(password)) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' });
    }

    next();
  } catch (error) {
    console.error("VALIDATION REGISTER ERROR:", error);
    res.status(500).json({ message: "Internal Validator Error", error: error.message });
  }
};

// Middleware for LOGIN
const validateLogin = (req, res, next) => {
  try {
    let { phone, password } = req.body;

    // 1. Sanitize phone
    const cleanPhone = phone ? phone.replace(/\D/g, '') : "";
    req.body.phone = cleanPhone;

    // 2. Validate Phone
    if (!cleanPhone || !validatePhone(cleanPhone)) {
      return res.status(400).json({ message: 'Please enter a valid 10-digit phone number' });
    }

    // 3. Validate Password
    if (!password || password.trim() === "") {
      return res.status(400).json({ message: 'Password is required' });
    }

    next();
  } catch (error) {
    console.error("VALIDATION LOGIN ERROR:", error);
    res.status(500).json({ message: "Internal Validator Error", error: error.message });
  }
};

module.exports = {
  validateRegister,
  validateLogin
};