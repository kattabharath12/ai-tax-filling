const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

// Create sequelize instance
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: console.log
});

// Define User model directly here
const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING(255),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  taxInfo: {
    type: DataTypes.JSONB,
    defaultValue: {},
    allowNull: false
  },
  documents: {
    type: DataTypes.JSONB,
    defaultValue: [],
    allowNull: false
  },
  taxReturn: {
    type: DataTypes.JSONB,
    defaultValue: {},
    allowNull: false
  },
  payments: {
    type: DataTypes.JSONB,
    defaultValue: [],
    allowNull: false
  }
}, {
  tableName: 'Users',
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    }
  }
});

// Add instance method
User.prototype.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Export both sequelize and models
module.exports = {
  sequelize,
  User
};
