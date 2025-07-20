const { DataTypes, Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

// Use DATABASE_URL from Railway
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  logging: false
});

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 255]
    }
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  taxInfo: {
    type: DataTypes.JSONB,
    defaultValue: {
      filingStatus: 'single',
      dependents: [],
      address: {}
    }
  },
  documents: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  taxReturn: {
    type: DataTypes.JSONB,
    defaultValue: {
      form1040: null,
      status: 'draft',
      submissionDate: null
    }
  },
  payments: {
    type: DataTypes.JSONB,
    defaultValue: []
  }
}, {
  timestamps: true,
  hooks: {
    beforeCreate: async (user) => {
      if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
      }
    }
  }
});

// Instance method to compare password
User.prototype.comparePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

module.exports = User;
