const { 
  Lecturer, 
  Student, 
  Classroom, 
  Assignment, 
  AssignmentSubmission 
} = require('../models');

async function seedDatabase() {
  try {
    console.log('Starting database seeding...');

    // Create sample lecturers
    const lecturer1 = await Lecturer.create({
      name: 'Dr. John Smith',
      email: 'john.smith@university.edu',
      phone_number: '+1234567890',
      department: 'Computer Science',
      bio: 'Professor of Computer Science with 15 years of experience in software engineering and artificial intelligence.',
      password: 'lecturer123'
    });

    const lecturer2 = await Lecturer.create({
      name: 'Dr. Sarah Johnson',
      email: 'sarah.johnson@university.edu',
      phone_number: '+1234567891',
      department: 'Mathematics',
      bio: 'Associate Professor of Mathematics specializing in calculus and linear algebra.',
      password: 'lecturer456'
    });

    console.log('Lecturers created successfully');

    // Create sample students
    const student1 = await Student.create({
      name: 'Alice Brown',
      email: 'alice.brown@student.edu',
      password: 'student123'
    });

    const student2 = await Student.create({
      name: 'Bob Wilson',
      email: 'bob.wilson@student.edu',
      password: 'student456'
    });

    const student3 = await Student.create({
      name: 'Charlie Davis',
      email: 'charlie.davis@student.edu',
      password: 'student789'
    });

    console.log('Students created successfully');

    // Create sample classrooms
    const classroom1 = await Classroom.create({
      class_name: 'Introduction to Programming',
      class_details: 'Learn the fundamentals of programming using Python',
      classroom_code: 'CS101A',
      created_by: lecturer1.id
    });

    const classroom2 = await Classroom.create({
      class_name: 'Calculus I',
      class_details: 'Differential and integral calculus',
      classroom_code: 'MATH101',
      created_by: lecturer2.id
    });

    console.log('Classrooms created successfully');

    // Add students to classrooms
    await classroom1.addStudents([student1, student2, student3]);
    await classroom2.addStudents([student1, student2]);

    console.log('Students added to classrooms');

    // Create sample assignments
    const assignment1 = await Assignment.create({
      assignment_title: 'Python Basics - Variables and Data Types',
      assignment_details: 'Complete exercises on Python variables, data types, and basic operations.',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      created_by: lecturer1.id,
      classroom_id: classroom1.id
    });

    const assignment2 = await Assignment.create({
      assignment_title: 'Limits and Continuity',
      assignment_details: 'Solve problems related to limits and continuity of functions.',
      due_date: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 days from now
      created_by: lecturer2.id,
      classroom_id: classroom2.id
    });

    console.log('Assignments created successfully');

    // Create sample submissions
    const submission1 = await AssignmentSubmission.create({
      assignment_file: '/uploads/alice_python_assignment.pdf',
      mark: 85.5,
      student_id: student1.id,
      assignment_id: assignment1.id,
      status: 'graded',
      feedback: 'Good work! Pay attention to variable naming conventions.',
      graded_by: lecturer1.id,
      graded_at: new Date()
    });

    const submission2 = await AssignmentSubmission.create({
      assignment_file: '/uploads/bob_python_assignment.pdf',
      student_id: student2.id,
      assignment_id: assignment1.id,
      status: 'submitted'
    });

    console.log('Assignment submissions created successfully');

    console.log('Database seeding completed successfully!');
    console.log(`
Sample Data Created:
- Lecturers: ${lecturer1.name}, ${lecturer2.name}
- Students: ${student1.name}, ${student2.name}, ${student3.name}
- Classrooms: ${classroom1.class_name} (${classroom1.classroom_code}), ${classroom2.class_name} (${classroom2.classroom_code})
- Assignments: ${assignment1.assignment_title}, ${assignment2.assignment_title}
- Submissions: 2 submissions created
    `);

  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  }
}

module.exports = { seedDatabase };
