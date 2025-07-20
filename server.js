const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const { sequelize, User } = require('./database');

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

// Initialize database and create tables
async function initializeDatabase() {
  try {
    console.log('🔄 Connecting to PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected successfully');
    
    console.log('🔄 Models registered:', Object.keys(sequelize.models));
    
    console.log('🔄 Forcing table creation...');
    await sequelize.sync({ 
      force: true,
      logging: console.log 
    });
    console.log('✅ Database sync completed');
    
    // Check what tables were actually created
    const [results] = await sequelize.query(`
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      ORDER BY table_name, ordinal_position;
    `);
    
    if (results.length > 0) {
      console.log('✅ Tables and columns created:');
      const tableGroups = results.reduce((acc, row) => {
        if (!acc[row.table_name]) acc[row.table_name] = [];
        acc[row.table_name].push(`${row.column_name} (${row.data_type})`);
        return acc;
      }, {});
      
      Object.entries(tableGroups).forEach(([table, columns]) => {
        console.log(`📋 ${table}:`, columns.join(', '));
      });
    } else {
      console.log('❌ No tables were created!');
    }
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
  }
}

// Start server
async function startServer() {
  await initializeDatabase();
  
  // Make models available to routes
  app.locals.User = User;
  app.locals.sequelize = sequelize;
  
  // Routes
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

module.exports = { sequelize, User };
