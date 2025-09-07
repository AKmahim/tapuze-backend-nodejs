const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AssignmentSubmission = sequelize.define('AssignmentSubmission', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  assignment_file: {
    type: DataTypes.STRING, // Store file path or URL
    allowNull: true
  },
  file_data: {
    type: DataTypes.TEXT('long'), // For storing base64 data if needed
    allowNull: true
  },
  mark: {
    type: DataTypes.DECIMAL(5, 2), // Allows for marks like 95.50
    allowNull: true,
    validate: {
      min: 0,
      max: 100
    }
  },
  student_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'students',
      key: 'id'
    }
  },
  assignment_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'assignments',
      key: 'id'
    }
  },
  status: {
    type: DataTypes.ENUM('submitted', 'graded', 'returned', 'late'),
    allowNull: false,
    defaultValue: 'submitted'
  },
  feedback: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  graded_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  graded_by: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'lecturers',
      key: 'id'
    }
  }
}, {
  tableName: 'assignment_submissions',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  hooks: {
    beforeUpdate: (submission) => {
      if (submission.changed('mark') && submission.mark !== null) {
        submission.status = 'graded';
        submission.graded_at = new Date();
      }
    }
  }
});

module.exports = AssignmentSubmission;
