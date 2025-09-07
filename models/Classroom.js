const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Classroom = sequelize.define('Classroom', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  class_name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  class_details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  classroom_code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      len: [6, 10]
    }
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'lecturers',
      key: 'id'
    }
  }
}, {
  tableName: 'classrooms',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeCreate: (classroom) => {
      if (!classroom.classroom_code) {
        // Generate a random 6-character code
        classroom.classroom_code = Math.random().toString(36).substring(2, 8).toUpperCase();
      }
    }
  }
});

module.exports = Classroom;
