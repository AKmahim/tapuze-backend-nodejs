const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Assignment = sequelize.define('Assignment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  assignment_title: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 200]
    }
  },
  assignment_details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  due_date: {
    type: DataTypes.DATE,
    allowNull: true,
    validate: {
      isDate: true,
      isAfter: new Date().toDateString() // Due date should be in the future
    }
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'lecturers',
      key: 'id'
    }
  },
  classroom_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'classrooms',
      key: 'id'
    }
  }
}, {
  tableName: 'assignments',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

module.exports = Assignment;
