const express = require('express');
const { Sequelize } = require('sequelize');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// PostgreSQL connection using Railway's DATABASE_URL
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: console.log // Show SQL queries in logs
});

// Initialize database and create tables
async function initializeDatabase() {
  try {
    console.log('🔄 Connecting to PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected successfully');
    
    console.log('🔄 Loading User model...');
    const User = require('./models/User');
    console.log('✅ User model loaded');
    
    console.log('🔄 Creating database tables...');
    // Force sync - this will DROP existing tables and recreate them
    await sequelize.sync({ force: true });
    console.log('✅ Database tables created successfully');
    
    // Verify tables exist
    const [results] = await sequelize.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📋 Tables created:', results.map(r => r.table_name));
    
    if (results.length === 0) {
      console.log('⚠️ No tables found after sync');
    }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    console.error('Error details:', error.message);
  }
}

// Start server and initialize database
async function startServer() {
  await initializeDatabase();
  
  // Routes (only register after database is ready)
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/tax', require('./routes/tax'));
  app.use('/api/upload', require('./routes/upload'));
  app.use('/api/payment', require('./routes/payment'));

  // Serve frontend
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

startServer();

module.exports = { sequelize };
