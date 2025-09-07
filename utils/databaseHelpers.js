const { 
  Lecturer, 
  Student, 
  Classroom, 
  Assignment, 
  AssignmentSubmission,
  StudentClassroom 
} = require('../models');

class DatabaseHelpers {
  // Lecturer helpers
  static async createLecturer(data) {
    return await Lecturer.create(data);
  }

  static async findLecturerByEmail(email) {
    return await Lecturer.findOne({ where: { email } });
  }

  static async findLecturerById(id) {
    return await Lecturer.findByPk(id, {
      include: [
        { model: Classroom, as: 'classrooms' },
        { model: Assignment, as: 'assignments' }
      ]
    });
  }

  // Student helpers
  static async createStudent(data) {
    return await Student.create(data);
  }

  static async findStudentByEmail(email) {
    return await Student.findOne({ where: { email } });
  }

  static async findStudentById(id) {
    return await Student.findByPk(id, {
      include: [
        { model: Classroom, as: 'classrooms' },
        { model: AssignmentSubmission, as: 'submissions' }
      ]
    });
  }

  // Classroom helpers
  static async createClassroom(data) {
    return await Classroom.create(data);
  }

  static async findClassroomByCode(classroom_code) {
    return await Classroom.findOne({ 
      where: { classroom_code },
      include: [
        { model: Lecturer, as: 'lecturer' },
        { model: Student, as: 'students' },
        { model: Assignment, as: 'assignments' }
      ]
    });
  }

  static async findClassroomById(id) {
    return await Classroom.findByPk(id, {
      include: [
        { model: Lecturer, as: 'lecturer' },
        { model: Student, as: 'students' },
        { model: Assignment, as: 'assignments' }
      ]
    });
  }

  static async joinClassroom(studentId, classroomId) {
    return await StudentClassroom.create({
      student_id: studentId,
      classroom_id: classroomId
    });
  }

  // Assignment helpers
  static async createAssignment(data) {
    return await Assignment.create(data);
  }

  static async findAssignmentById(id) {
    return await Assignment.findByPk(id, {
      include: [
        { model: Lecturer, as: 'lecturer' },
        { model: Classroom, as: 'classroom' },
        { model: AssignmentSubmission, as: 'submissions', include: [{ model: Student, as: 'student' }] }
      ]
    });
  }

  static async getAssignmentsByClassroom(classroomId) {
    return await Assignment.findAll({
      where: { classroom_id: classroomId },
      include: [
        { model: Lecturer, as: 'lecturer' },
        { model: AssignmentSubmission, as: 'submissions', include: [{ model: Student, as: 'student' }] }
      ],
      order: [['created_at', 'DESC']]
    });
  }

  // Assignment Submission helpers
  static async createSubmission(data) {
    return await AssignmentSubmission.create(data);
  }

  static async findSubmissionById(id) {
    return await AssignmentSubmission.findByPk(id, {
      include: [
        { model: Student, as: 'student' },
        { model: Assignment, as: 'assignment' },
        { model: Lecturer, as: 'grader' }
      ]
    });
  }

  static async updateSubmissionGrade(id, mark, feedback, gradedBy) {
    return await AssignmentSubmission.update(
      { 
        mark, 
        feedback, 
        graded_by: gradedBy,
        graded_at: new Date(),
        status: 'graded'
      },
      { where: { id } }
    );
  }

  static async findSubmissionByStudentAndAssignment(studentId, assignmentId) {
    return await AssignmentSubmission.findOne({
      where: { 
        student_id: studentId, 
        assignment_id: assignmentId 
      },
      include: [
        { model: Student, as: 'student' },
        { model: Assignment, as: 'assignment' }
      ]
    });
  }

  // General helpers
  static async generateUniqueClassroomCode() {
    let code;
    let exists = true;
    
    while (exists) {
      code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existingClassroom = await Classroom.findOne({ where: { classroom_code: code } });
      exists = !!existingClassroom;
    }
    
    return code;
  }
}

module.exports = DatabaseHelpers;
