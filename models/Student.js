const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const Student = sequelize.define('Student', {
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
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      len: [6, 100]
    }
  }
}, {
  tableName: 'students',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: async (student) => {
      if (student.password) {
        student.password = await bcrypt.hash(student.password, 10);
      }
    },
    beforeUpdate: async (student) => {
      if (student.changed('password')) {
        student.password = await bcrypt.hash(student.password, 10);
      }
    }
  }
});

// Instance methods
Student.prototype.validatePassword = async function(password) {
  return await bcrypt.compare(password, this.password);
};

// Remove password from JSON output
Student.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password;
  return values;
};

module.exports = Student;
