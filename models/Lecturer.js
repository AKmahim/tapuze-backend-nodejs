const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const Lecturer = sequelize.define('Lecturer', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  phone_number: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [10, 15]
    }
  },
  department: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      len: [2, 100]
    }
  },
  bio: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 100]
    }
  }
}, {
  tableName: 'lecturers',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (lecturer) => {
      if (lecturer.password) {
        lecturer.password = await bcrypt.hash(lecturer.password, 10);
      }
    },
    beforeUpdate: async (lecturer) => {
      if (lecturer.changed('password')) {
        lecturer.password = await bcrypt.hash(lecturer.password, 10);
      }
    }
  }
});

// Instance methods
Lecturer.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Remove password from JSON output
Lecturer.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = Lecturer;
