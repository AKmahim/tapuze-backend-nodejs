# Tapuze Backend - Database Models

This document describes the database models created for the Tapuze educational platform.

## Database Schema

### Models

1. **Lecturer** - Teachers/Instructors
2. **Student** - Students
3. **Classroom** - Virtual classrooms
4. **Assignment** - Assignments created by lecturers
5. **AssignmentSubmission** - Student submissions for assignments
6. **StudentClassroom** - Many-to-many relationship between students and classrooms

## Model Details

### Lecturer
- `id` (PK, Auto-increment)
- `name` (String, Required)
- `email` (String, Unique, Required)
- `phone_number` (String, Optional)
- `department` (String, Optional)
- `bio` (Text, Optional)
- `password` (String, Hashed, Required)
- `created_at`, `updated_at` (Timestamps)

### Student
- `id` (PK, Auto-increment)
- `name` (String, Required)
- `email` (String, Unique, Required)
- `password` (String, Hashed, Required)
- `created_at`, `updated_at` (Timestamps)

### Classroom
- `id` (PK, Auto-increment)
- `class_name` (String, Required)
- `class_details` (Text, Optional)
- `classroom_code` (String, Unique, Required)
- `created_by` (FK to Lecturer)
- `created_at`, `updated_at` (Timestamps)

### Assignment
- `id` (PK, Auto-increment)
- `assignment_title` (String, Required)
- `assignment_details` (Text, Optional)
- `due_date` (Date, Optional)
- `created_by` (FK to Lecturer)
- `classroom_id` (FK to Classroom)
- `created_at`, `updated_at` (Timestamps)

### AssignmentSubmission
- `id` (PK, Auto-increment)
- `assignment_file` (String, File path)
- `file_data` (Text, Base64 data)
- `mark` (Decimal, 0-100)
- `student_id` (FK to Student)
- `assignment_id` (FK to Assignment)
- `status` (Enum: submitted, graded, returned, late)
- `feedback` (Text, Optional)
- `graded_at` (Date, Optional)
- `graded_by` (FK to Lecturer, Optional)
- `created_at`, `updated_at` (Timestamps)

## Setup Instructions

### 1. Environment Configuration
Copy `.env.example` to `.env` and configure your database settings:

```env
DB_NAME=tapuze_nodejs
DB_USER=your_username
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=3306
NODE_ENV=development
```

### 2. Database Setup

```bash
# Install dependencies (if not already done)
npm install

# Setup database (creates tables)
npm run db:setup

# Setup database with sample data
npm run db:seed

# Reset database and seed with fresh data
npm run db:reset
```

## Usage Examples

### Using Database Helpers

```javascript
const DatabaseHelpers = require('./utils/databaseHelpers');

// Create a new lecturer
const lecturer = await DatabaseHelpers.createLecturer({
  name: 'Dr. Jane Doe',
  email: 'jane.doe@university.edu',
  department: 'Computer Science',
  password: 'securepassword'
});

// Find lecturer by email
const foundLecturer = await DatabaseHelpers.findLecturerByEmail('jane.doe@university.edu');

// Create a classroom
const classroom = await DatabaseHelpers.createClassroom({
  class_name: 'Data Structures',
  class_details: 'Learn about arrays, linked lists, trees, and graphs',
  created_by: lecturer.id
});

// Student joins classroom
await DatabaseHelpers.joinClassroom(studentId, classroom.id);
```

### Direct Model Usage

```javascript
const { Lecturer, Student, Classroom, Assignment } = require('./models');

// Create with associations
const assignment = await Assignment.create({
  assignment_title: 'Final Project',
  assignment_details: 'Complete the final project requirements',
  due_date: new Date('2024-12-31'),
  created_by: lecturerId,
  classroom_id: classroomId
});

// Find with associations
const classroomWithDetails = await Classroom.findByPk(classroomId, {
  include: [
    { model: Lecturer, as: 'lecturer' },
    { model: Student, as: 'students' },
    { model: Assignment, as: 'assignments' }
  ]
});
```

## API Integration

To integrate these models with your existing Express server, you can:

1. Replace the JSON file database operations with Sequelize model operations
2. Use the DatabaseHelpers for common operations
3. Implement proper authentication and authorization
4. Add validation middleware

## Security Features

- Passwords are automatically hashed using bcryptjs
- Password fields are excluded from JSON responses
- Input validation using Sequelize validators
- Foreign key constraints ensure data integrity

## Migration from JSON Database

Your existing `db.json` structure can be migrated to this database schema. The main mappings are:

- `classrooms` → `Classroom` model with proper relationships
- Add `Lecturer` and `Student` models for proper user management
- Transform assignment data to use the new `Assignment` and `AssignmentSubmission` models
