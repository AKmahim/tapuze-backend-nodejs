const sequelize = require('../config/database');

// Import all models
const Lecturer = require('./Lecturer');
const Student = require('./Student');
const Classroom = require('./Classroom');
const Assignment = require('./Assignment');
const AssignmentSubmission = require('./AssignmentSubmission');

// Define associations

// Lecturer associations
Lecturer.hasMany(Classroom, {
  foreignKey: 'created_by',
  as: 'classrooms'
});

Lecturer.hasMany(Assignment, {
  foreignKey: 'created_by',
  as: 'assignments'
});

Lecturer.hasMany(AssignmentSubmission, {
  foreignKey: 'graded_by',
  as: 'graded_submissions'
});

// Classroom associations
Classroom.belongsTo(Lecturer, {
  foreignKey: 'created_by',
  as: 'lecturer'
});

Classroom.hasMany(Assignment, {
  foreignKey: 'classroom_id',
  as: 'assignments'
});

// Assignment associations
Assignment.belongsTo(Lecturer, {
  foreignKey: 'created_by',
  as: 'lecturer'
});

Assignment.belongsTo(Classroom, {
  foreignKey: 'classroom_id',
  as: 'classroom'
});

Assignment.hasMany(AssignmentSubmission, {
  foreignKey: 'assignment_id',
  as: 'submissions'
});

// Student associations
Student.hasMany(AssignmentSubmission, {
  foreignKey: 'student_id',
  as: 'submissions'
});

// AssignmentSubmission associations
AssignmentSubmission.belongsTo(Student, {
  foreignKey: 'student_id',
  as: 'student'
});

AssignmentSubmission.belongsTo(Assignment, {
  foreignKey: 'assignment_id',
  as: 'assignment'
});

AssignmentSubmission.belongsTo(Lecturer, {
  foreignKey: 'graded_by',
  as: 'grader'
});

// Many-to-many association for students and classrooms
const StudentClassroom = sequelize.define('StudentClassroom', {
  student_id: {
    type: require('sequelize').DataTypes.INTEGER,
    references: {
      model: Student,
      key: 'id'
    }
  },
  classroom_id: {
    type: require('sequelize').DataTypes.INTEGER,
    references: {
      model: Classroom,
      key: 'id'
    }
  },
  joined_at: {
    type: require('sequelize').DataTypes.DATE,
    defaultValue: require('sequelize').DataTypes.NOW
  }
}, {
  tableName: 'student_classrooms',
  timestamps: false
});

Student.belongsToMany(Classroom, {
  through: StudentClassroom,
  foreignKey: 'student_id',
  otherKey: 'classroom_id',
  as: 'classrooms'
});

Classroom.belongsToMany(Student, {
  through: StudentClassroom,
  foreignKey: 'classroom_id',
  otherKey: 'student_id',
  as: 'students'
});

module.exports = {
  sequelize,
  Lecturer,
  Student,
  Classroom,
  Assignment,
  AssignmentSubmission,
  StudentClassroom
};
