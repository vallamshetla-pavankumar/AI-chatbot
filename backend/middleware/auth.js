const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  // Expecting format: Bearer <token>
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token missing or malformed' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_hash_key_123_456', (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired access token' });
    }
    req.admin = decoded;
    next();
  });
}

module.exports = authenticateToken;
