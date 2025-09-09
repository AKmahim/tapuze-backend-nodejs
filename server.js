require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const { gradeHomework } = require('./geminiService');
const { convertPdfToImage } = require('./pdfConverter');
const { Lecturer, Classroom, Assignment, Student } = require('./models');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'db.json');

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for base64 images

// Multer setup for file uploads in memory
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper functions for DB operations
const readDB = () => {
    try {
        if (!fs.existsSync(DB_PATH)) {
            // If db.json doesn't exist, create it with an empty structure
            fs.writeFileSync(DB_PATH, JSON.stringify({ classrooms: [] }, null, 2));
        }
        const data = fs.readFileSync(DB_PATH, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading database:', error);
        // Return a default structure if reading fails
        return { classrooms: [] };
    }
};

const writeDB = (data) => {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
        console.error('Error writing to database:', error);
    }
};

// JWT Authentication Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ message: 'Access token required.' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
};

// Middleware to verify lecturer role
const requireLecturer = (req, res, next) => {
    if (req.user.type !== 'lecturer') {
        return res.status(403).json({ message: 'Lecturer access required.' });
    }
    next();
};

// Middleware to verify student role
const requireStudent = (req, res, next) => {
    if (req.user.type !== 'student') {
        return res.status(403).json({ message: 'Student access required.' });
    }
    next();
};

// --- API Routes ---

// POST to test PDF to Image conversion (for Postman debugging)
app.post('/api/test-pdf-conversion', upload.single('homeworkPdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No PDF file uploaded. Please upload a file with the key "homeworkPdf".' });
    }

    try {
        // Convert the PDF buffer to a base64 image string
        const imageBase64 = await convertPdfToImage(req.file.buffer);
        
        res.status(200).json({
            fileName: req.file.originalname,
            fileData: imageBase64,
        });
    } catch (error) {
        console.error('PDF Conversion Test Error:', error);
        res.status(500).json({ message: error.message || 'An error occurred during PDF conversion.' });
    }
});

// POST to test AI evaluation directly from a PDF file upload (for Postman)
app.post('/api/test-evaluation', upload.single('homeworkPdf'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No PDF file uploaded. Please upload a file with the key "homeworkPdf".' });
    }

    try {
        // Convert the PDF buffer to a base64 image string
        const imageBase64 = await convertPdfToImage(req.file.buffer);
        
        // Send the image to the AI for grading
        const evaluation = await gradeHomework(imageBase64);
        
        res.status(200).json(evaluation);
    } catch (error) {
        console.error('PDF Evaluation Error:', error);
        res.status(500).json({ message: error.message || 'An error occurred during PDF processing or AI evaluation.' });
    }
});


// POST simulate AI evaluation from a base64 image (used by frontend)
app.post('/api/evaluate', async (req, res) => {
    const { fileData } = req.body;
    if (!fileData) {
        return res.status(400).json({ message: 'fileData (base64 string) is required.' });
    }
    try {
        const evaluation = await gradeHomework(fileData);
        res.status(200).json(evaluation);
    } catch (error) {
        console.error('AI Evaluation Error:', error);
        res.status(500).json({ message: error.message || 'An error occurred during AI evaluation.' });
    }
});

// POST lecturer signup
app.post('/api/lecturers/signup', async (req, res) => {
    const { name, email, password } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
        return res.status(400).json({ 
            message: 'Name, email, and password are required.' 
        });
    }

    try {
        // Check if lecturer with email already exists
        const existingLecturer = await Lecturer.findOne({ where: { email } });
        if (existingLecturer) {
            return res.status(409).json({ 
                message: 'A lecturer with this email already exists.' 
            });
        }

        // Create new lecturer
        const newLecturer = await Lecturer.create({
            name,
            email,
            password
        });

        res.status(201).json({
            message: 'Lecturer registered successfully.',
            lecturer: newLecturer
        });
    } catch (error) {
        console.error('Lecturer Signup Error:', error);
        
        // Handle validation errors
        if (error.name === 'SequelizeValidationError') {
            const validationErrors = error.errors.map(err => err.message);
            return res.status(400).json({ 
                message: 'Validation error.',
                errors: validationErrors 
            });
        }
        
        // Handle unique constraint errors
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ 
                message: 'A lecturer with this email already exists.' 
            });
        }
        
        res.status(500).json({ 
            message: 'An error occurred during registration.' 
        });
    }
});

// POST lecturer signin
app.post('/api/lecturers/signin', async (req, res) => {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
        return res.status(400).json({ 
            message: 'Email and password are required.' 
        });
    }

    try {
        // Find lecturer by email
        const lecturer = await Lecturer.findOne({ where: { email } });
        if (!lecturer) {
            return res.status(401).json({ 
                message: 'Invalid email or password.' 
            });
        }

        // Validate password
        const isValidPassword = await lecturer.validatePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                message: 'Invalid email or password.' 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: lecturer.id, 
                email: lecturer.email,
                name: lecturer.name,
                type: 'lecturer'
            },
            process.env.JWT_SECRET || 'your-secret-key', // Use environment variable
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: 'Sign in successful.',
            token,
            lecturer: {
                id: lecturer.id,
                name: lecturer.name,
                email: lecturer.email,
                department: lecturer.department,
                bio: lecturer.bio
            }
        });
    } catch (error) {
        console.error('Lecturer Signin Error:', error);
        res.status(500).json({ 
            message: 'An error occurred during sign in.' 
        });
    }
});

// POST student signup
app.post('/api/students/signup', async (req, res) => {
    const { name, email, password } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
        return res.status(400).json({ 
            message: 'Name, email, and password are required.' 
        });
    }

    try {
        // Check if student with email already exists
        const existingStudent = await Student.findOne({ where: { email } });
        if (existingStudent) {
            return res.status(409).json({ 
                message: 'A student with this email already exists.' 
            });
        }

        // Create new student
        const newStudent = await Student.create({
            name,
            email,
            password
        });

        res.status(201).json({
            message: 'Student registered successfully.',
            student: {
                id: newStudent.id,
                name: newStudent.name,
                email: newStudent.email,
                created_at: newStudent.created_at,
                updated_at: newStudent.updated_at
            }
        });
    } catch (error) {
        console.error('Student Signup Error:', error);
        
        // Handle validation errors
        if (error.name === 'SequelizeValidationError') {
            const validationErrors = error.errors.map(err => err.message);
            return res.status(400).json({ 
                message: 'Validation error.',
                errors: validationErrors 
            });
        }
        
        // Handle unique constraint errors
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ 
                message: 'A student with this email already exists.' 
            });
        }
        
        res.status(500).json({ 
            message: 'An error occurred during registration.' 
        });
    }
});

// POST student signin
app.post('/api/students/signin', async (req, res) => {
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
        return res.status(400).json({ 
            message: 'Email and password are required.' 
        });
    }

    try {
        // Find student by email
        const student = await Student.findOne({ where: { email } });
        if (!student) {
            return res.status(401).json({ 
                message: 'Invalid email or password.' 
            });
        }

        // Validate password
        const isValidPassword = await student.validatePassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                message: 'Invalid email or password.' 
            });
        }

        // Generate JWT token
        const token = jwt.sign(
            { 
                id: student.id, 
                email: student.email,
                name: student.name,
                type: 'student'
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(200).json({
            message: 'Sign in successful.',
            token,
            student: {
                id: student.id,
                name: student.name,
                email: student.email,
                created_at: student.created_at,
                updated_at: student.updated_at
            }
        });
    } catch (error) {
        console.error('Student Signin Error:', error);
        res.status(500).json({ 
            message: 'An error occurred during sign in.' 
        });
    }
});

// GET student profile (protected route)
app.get('/api/students/profile', authenticateToken, requireStudent, async (req, res) => {
    try {
        const student = await Student.findByPk(req.user.id);
        if (!student) {
            return res.status(404).json({ message: 'Student not found.' });
        }
        
        res.status(200).json({
            student: {
                id: student.id,
                name: student.name,
                email: student.email,
                created_at: student.created_at,
                updated_at: student.updated_at
            }
        });
    } catch (error) {
        console.error('Get Student Profile Error:', error);
        res.status(500).json({ 
            message: 'An error occurred while fetching profile.' 
        });
    }
});

// GET lecturer profile (protected route)
app.get('/api/lecturers/profile', authenticateToken, requireLecturer, async (req, res) => {
    try {
        const lecturer = await Lecturer.findByPk(req.user.id);
        if (!lecturer) {
            return res.status(404).json({ message: 'Lecturer not found.' });
        }
        
        res.status(200).json({
            lecturer: {
                id: lecturer.id,
                name: lecturer.name,
                email: lecturer.email,
                phone_number: lecturer.phone_number,
                department: lecturer.department,
                bio: lecturer.bio,
                created_at: lecturer.created_at,
                updated_at: lecturer.updated_at
            }
        });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({ 
            message: 'An error occurred while fetching profile.' 
        });
    }
});

// GET all classrooms for authenticated lecturer
app.get('/api/classrooms', authenticateToken, requireLecturer, async (req, res) => {
    try {
        const classrooms = await Classroom.findAll({
            where: {
                created_by: req.user.id
            },
            include: [{
                model: Lecturer,
                as: 'lecturer',
                attributes: ['id', 'name', 'email', 'department']
            }],
            order: [['created_at', 'DESC']]
        });

        res.status(200).json({
            classrooms: classrooms.map(classroom => ({
                id: classroom.id,
                class_name: classroom.class_name,
                class_details: classroom.class_details,
                classroom_code: classroom.classroom_code,
                created_by: classroom.created_by,
                created_at: classroom.created_at,
                updated_at: classroom.updated_at,
                lecturer: classroom.lecturer
            }))
        });
    } catch (error) {
        console.error('Get Classrooms Error:', error);
        res.status(500).json({ 
            message: 'An error occurred while fetching classrooms.' 
        });
    }
});

// GET specific classroom by ID
app.get('/api/classrooms/:id', authenticateToken, requireLecturer, async (req, res) => {
    const { id } = req.params;

    try {
        const classroom = await Classroom.findOne({
            where: {
                id: id,
                created_by: req.user.id // Ensure lecturer can only access their own classrooms
            },
            include: [{
                model: Lecturer,
                as: 'lecturer',
                attributes: ['id', 'name', 'email', 'department']
            }]
        });

        if (!classroom) {
            return res.status(404).json({ 
                message: 'Classroom not found or you do not have access to it.' 
            });
        }

        res.status(200).json({
            classroom: {
                id: classroom.id,
                class_name: classroom.class_name,
                class_details: classroom.class_details,
                classroom_code: classroom.classroom_code,
                created_by: classroom.created_by,
                created_at: classroom.created_at,
                updated_at: classroom.updated_at,
                lecturer: classroom.lecturer
            }
        });
    } catch (error) {
        console.error('Get Classroom Error:', error);
        res.status(500).json({ 
            message: 'An error occurred while fetching the classroom.' 
        });
    }
});

// GET classroom by classroom_code
app.get('/api/classrooms/code/:classroomCode', authenticateToken, async (req, res) => {
    const { classroomCode } = req.params;

    try {
        const classroom = await Classroom.findOne({
            where: {
                classroom_code: classroomCode.toUpperCase()
            },
            include: [{
                model: Lecturer,
                as: 'lecturer',
                attributes: ['id', 'name', 'email', 'department']
            }]
        });

        if (!classroom) {
            return res.status(404).json({ 
                message: 'Classroom not found with the provided classroom code.' 
            });
        }

        // Check if user has access to this classroom
        // Lecturers can only access their own classrooms
        // Students can access any classroom (for joining purposes)
        if (req.user.type === 'lecturer' && classroom.created_by !== req.user.id) {
            return res.status(403).json({ 
                message: 'You do not have permission to access this classroom.' 
            });
        }

        res.status(200).json({
            classroom: {
                id: classroom.id,
                class_name: classroom.class_name,
                class_details: classroom.class_details,
                classroom_code: classroom.classroom_code,
                created_by: classroom.created_by,
                created_at: classroom.created_at,
                updated_at: classroom.updated_at,
                lecturer: classroom.lecturer
            }
        });
    } catch (error) {
        console.error('Get Classroom by Code Error:', error);
        res.status(500).json({ 
            message: 'An error occurred while fetching the classroom.' 
        });
    }
});

// POST create a new classroom (protected route)
app.post('/api/classrooms', authenticateToken, requireLecturer, async (req, res) => {
    const { class_name, class_details, classroom_code } = req.body;
    
    // Validate required fields
    if (!class_name) {
        return res.status(400).json({ 
            message: 'Classroom name is required.' 
        });
    }

    if (!classroom_code) {
        return res.status(400).json({ 
            message: 'Classroom code is required.' 
        });
    }

    try {
        // Create new classroom using Sequelize model
        const newClassroom = await Classroom.create({
            class_name,
            class_details: class_details || null,
            classroom_code: classroom_code.toUpperCase() || null, // Ensure code is uppercase
            created_by: req.user.id // Use authenticated lecturer's ID
        });

        res.status(201).json({
            message: 'Classroom created successfully.',
            classroom: {
                id: newClassroom.id,
                class_name: newClassroom.class_name,
                class_details: newClassroom.class_details,
                classroom_code: newClassroom.classroom_code,
                created_by: newClassroom.created_by,
                created_at: newClassroom.created_at,
                updated_at: newClassroom.updated_at
            }
        });
    } catch (error) {
        console.error('Classroom Creation Error:', error);
        
        // Handle validation errors
        if (error.name === 'SequelizeValidationError') {
            const validationErrors = error.errors.map(err => err.message);
            return res.status(400).json({ 
                message: 'Validation error.',
                errors: validationErrors 
            });
        }
        
        // Handle unique constraint errors (duplicate classroom code)
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ 
                message: 'Classroom code already exists. Please use a different code.' 
            });
        }
        
        res.status(500).json({ 
            message: 'An error occurred while creating the classroom.' 
        });
    }
});

// GET all assignments for a specific classroom
app.get('/api/classrooms/:classroomId/assignments', authenticateToken, requireLecturer, async (req, res) => {
    const { classroomId } = req.params;

    try {
        // Verify that the classroom exists and belongs to the authenticated lecturer
        const classroom = await Classroom.findOne({
            where: {
                id: classroomId,
                created_by: req.user.id
            }
        });

        if (!classroom) {
            return res.status(404).json({ 
                message: 'Classroom not found or you do not have permission to view assignments in this classroom.' 
            });
        }

        // Get all assignments for the classroom
        const assignments = await Assignment.findAll({
            where: {
                classroom_id: classroomId
            },
            include: [
                {
                    model: Lecturer,
                    as: 'lecturer',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: Classroom,
                    as: 'classroom',
                    attributes: ['id', 'class_name', 'classroom_code']
                }
            ],
            order: [['created_at', 'DESC']]
        });

        res.status(200).json({
            assignments: assignments.map(assignment => ({
                id: assignment.id,
                assignment_title: assignment.assignment_title,
                assignment_details: assignment.assignment_details,
                due_date: assignment.due_date,
                created_by: assignment.created_by,
                classroom_id: assignment.classroom_id,
                created_at: assignment.created_at,
                updated_at: assignment.updated_at,
                lecturer: assignment.lecturer,
                classroom: assignment.classroom
            }))
        });
    } catch (error) {
        console.error('Get Assignments Error:', error);
        res.status(500).json({ 
            message: 'An error occurred while fetching assignments.' 
        });
    }
});

// GET specific assignment by ID
app.get('/api/classrooms/:classroomId/assignments/:assignmentId', authenticateToken, requireLecturer, async (req, res) => {
    const { classroomId, assignmentId } = req.params;

    try {
        // Verify that the classroom exists and belongs to the authenticated lecturer
        const classroom = await Classroom.findOne({
            where: {
                id: classroomId,
                created_by: req.user.id
            }
        });

        if (!classroom) {
            return res.status(404).json({ 
                message: 'Classroom not found or you do not have permission to view this classroom.' 
            });
        }

        // Get the specific assignment
        const assignment = await Assignment.findOne({
            where: {
                id: assignmentId,
                classroom_id: classroomId
            },
            include: [
                {
                    model: Lecturer,
                    as: 'lecturer',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: Classroom,
                    as: 'classroom',
                    attributes: ['id', 'class_name', 'classroom_code']
                }
            ]
        });

        if (!assignment) {
            return res.status(404).json({ 
                message: 'Assignment not found in this classroom.' 
            });
        }

        res.status(200).json({
            assignment: {
                id: assignment.id,
                assignment_title: assignment.assignment_title,
                assignment_details: assignment.assignment_details,
                due_date: assignment.due_date,
                created_by: assignment.created_by,
                classroom_id: assignment.classroom_id,
                created_at: assignment.created_at,
                updated_at: assignment.updated_at,
                lecturer: assignment.lecturer,
                classroom: assignment.classroom
            }
        });
    } catch (error) {
        console.error('Get Assignment Error:', error);
        res.status(500).json({ 
            message: 'An error occurred while fetching the assignment.' 
        });
    }
});

// POST join a classroom
app.post('/api/classrooms/join', (req, res) => {
    const { secretCode, studentId } = req.body;
    if (!secretCode || !studentId) {
        return res.status(400).json({ message: 'Secret code and student ID are required.' });
    }
    const db = readDB();
    const classroomToJoin = db.classrooms.find(c => c.secretCode === secretCode.toUpperCase());

    if (!classroomToJoin) {
        return res.status(404).json({ message: 'Invalid classroom code. Please try again.' });
    }
    if (classroomToJoin.studentIds.includes(studentId)) {
        return res.status(409).json({ message: 'You are already in this classroom.' });
    }

    classroomToJoin.studentIds.push(studentId);
    writeDB(db);
    res.status(200).json(classroomToJoin);
});

// POST create an assignment
app.post('/api/classrooms/:classroomId/assignments', authenticateToken, requireLecturer, async (req, res) => {
    const { classroomId } = req.params;
    const { assignment_title, assignment_details, due_date } = req.body;
    
    // Validate required fields
    if (!assignment_title) {
        return res.status(400).json({ 
            message: 'Assignment title is required.' 
        });
    }

    try {
        // Verify that the classroom exists and belongs to the authenticated lecturer
        const classroom = await Classroom.findOne({
            where: {
                id: classroomId,
                created_by: req.user.id
            }
        });

        if (!classroom) {
            return res.status(404).json({ 
                message: 'Classroom not found or you do not have permission to create assignments in this classroom.' 
            });
        }

        // Create new assignment
        const newAssignment = await Assignment.create({
            assignment_title,
            assignment_details: assignment_details || null,
            due_date: due_date ? new Date(due_date) : null,
            created_by: req.user.id,
            classroom_id: parseInt(classroomId)
        });

        // Fetch the created assignment with related data
        const assignmentWithDetails = await Assignment.findByPk(newAssignment.id, {
            include: [
                {
                    model: Lecturer,
                    as: 'lecturer',
                    attributes: ['id', 'name', 'email']
                },
                {
                    model: Classroom,
                    as: 'classroom',
                    attributes: ['id', 'class_name', 'classroom_code']
                }
            ]
        });

        res.status(201).json({
            message: 'Assignment created successfully.',
            assignment: {
                id: assignmentWithDetails.id,
                assignment_title: assignmentWithDetails.assignment_title,
                assignment_details: assignmentWithDetails.assignment_details,
                due_date: assignmentWithDetails.due_date,
                created_by: assignmentWithDetails.created_by,
                classroom_id: assignmentWithDetails.classroom_id,
                created_at: assignmentWithDetails.created_at,
                updated_at: assignmentWithDetails.updated_at,
                lecturer: assignmentWithDetails.lecturer,
                classroom: assignmentWithDetails.classroom
            }
        });
    } catch (error) {
        console.error('Assignment Creation Error:', error);
        
        // Handle validation errors
        if (error.name === 'SequelizeValidationError') {
            const validationErrors = error.errors.map(err => ({
                field: err.path,
                message: err.message
            }));
            return res.status(400).json({ 
                message: 'Validation failed.',
                errors: validationErrors
            });
        }
        
        res.status(500).json({ 
            message: 'An error occurred while creating the assignment.' 
        });
    }
});

// POST submit an assignment
app.post('/api/classrooms/:classroomId/assignments/:assignmentId/submissions', (req, res) => {
    const { classroomId, assignmentId } = req.params;
    const { studentId, fileData, fileName } = req.body;

    const db = readDB();
    const classroom = db.classrooms.find(c => c.id === classroomId);
    if (!classroom) return res.status(404).json({ message: 'Classroom not found.' });
    const assignment = classroom.assignments.find(a => a.id === assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });

    // Remove existing submission for the same student, if any
    assignment.submissions = assignment.submissions.filter(s => s.studentId !== studentId);

    const newSubmission = {
        id: uuidv4(),
        studentId,
        fileData,
        fileName,
        submittedAt: new Date().toISOString(),
        evaluation: null,
        isGraded: false,
    };
    assignment.submissions.push(newSubmission);
    writeDB(db);
    res.status(201).json(newSubmission);
});

// PUT update a submission (grade it)
app.put('/api/classrooms/:classroomId/assignments/:assignmentId/submissions/:submissionId', (req, res) => {
    const { classroomId, assignmentId, submissionId } = req.params;
    const { evaluation } = req.body;

    const db = readDB();
    const classroom = db.classrooms.find(c => c.id === classroomId);
    if (!classroom) return res.status(404).json({ message: 'Classroom not found.' });
    const assignment = classroom.assignments.find(a => a.id === assignmentId);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found.' });
    const submission = assignment.submissions.find(s => s.id === submissionId);
    if (!submission) return res.status(404).json({ message: 'Submission not found.' });

    submission.evaluation = evaluation;
    submission.isGraded = true;
    writeDB(db);
    res.status(200).json(submission);
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
