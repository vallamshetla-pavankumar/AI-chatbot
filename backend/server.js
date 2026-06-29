require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const prisma = require('./db');

// Dynamically push schema to SQLite if running in production/Render env
try {
  console.log('[STARTUP] Initializing SQLite database schema...');
  const { execSync } = require('child_process');
  execSync('npx prisma db push --skip-generate', { stdio: 'inherit' });
  console.log('[STARTUP] SQLite database initialized successfully.');
} catch (err) {
  console.error('[STARTUP] Failed to initialize SQLite database schema:', err);
}


const path = require('path');

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const menuRoutes = require('./routes/menu');
const chatRoutes = require('./routes/chat');
const whatsappRoutes = require('./routes/whatsapp');
const paymentRoutes = require('./routes/payment');

const app = express();
const PORT = process.env.PORT || 5001;

// Enable CORS for frontend requests
const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (
      /^http:\/\/localhost(:\d+)?$/.test(origin) ||
      origin === frontendUrl ||
      /^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)
    ) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));

// Parse JSON request bodies (up to 10MB for base64 images)
app.use(express.json({ limit: '10mb' }));

// Serve uploaded static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const rateLimiter = require('./middleware/rateLimiter');

// Mount API route handlers
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/chat', rateLimiter, chatRoutes);
app.use('/api/whatsapp', rateLimiter, whatsappRoutes);
app.use('/api/payment', paymentRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  return res.json({ status: 'healthy', timestamp: new Date() });
});

// Error handling fallback middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  return res.status(500).json({ error: 'Internal server error occurred' });
});

// Ensure default admin exists
async function ensureDefaultAdmin() {
  try {
    const admin = await prisma.admin.findUnique({
      where: { username: 'admin' }
    });
    if (!admin) {
      console.log('[STARTUP] Default admin not found. Creating default admin...');
      const passwordHash = await bcrypt.hash('admin123', 10);
      await prisma.admin.create({
        data: {
          username: 'admin',
          password_hash: passwordHash,
        }
      });
      console.log('[STARTUP] Default admin created successfully (username: admin, password: admin123).');
    } else {
      console.log('[STARTUP] Default admin user already exists.');
    }
  } catch (error) {
    console.error('[STARTUP] Error checking/creating default admin:', error);
  }
}

// Start the server
app.listen(PORT, async () => {
  console.log(`OrderBot Backend Server running on port ${PORT}`);
  await ensureDefaultAdmin();
});
