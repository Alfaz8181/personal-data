// server.js - FINAL SECURE DEPLOYABLE VERSION

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcrypt'); // Added for password hashing
const jwt = require('jsonwebtoken'); // Added for token management

// Load environment variables (like MONGO_URI and JWT_SECRET)
dotenv.config(); 

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// --- Middleware ---
app.use(cors());
app.use(express.json()); 

// --- 0. Serve Static Files (The Frontend) ---
// This serves index.html, style.css, and script.js when a user hits the root '/'
app.use(express.static(path.join(__dirname, '/'))); 

// --- 1. Database Connection ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connection successful!'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- 2. Data Models (User and Record) ---

// User Schema and Model
const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', UserSchema);

// Record Schema and Model (Updated to include userId)
const RecordSchema = new mongoose.Schema({
    type: { type: String, required: true },
    name: { type: String, required: true },
    idNumber: { type: String, required: true },
    password: { type: String, default: '' }, 
    notes: { type: String },
    // CRITICAL: Links the record to a specific user
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    createdAt: { type: Date, default: Date.now }
});

const Record = mongoose.model('Record', RecordSchema);


// --- Helper Functions for Security ---

// Generates a JWT token for the user ID
const createToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '1d' 
    });
};

// Middleware: Checks for a valid token on protected routes
const requireAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ message: 'Authorization token required.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        req.user_id = decodedToken.id; 
        next(); 
    } catch (err) {
        res.status(401).json({ message: 'Request is not authorized (Invalid token).' });
    }
};


// --- 3. API Routes ---

// AUTHENTICATION ROUTES (Unprotected)

// POST /api/auth/signup - Creates a new user and returns a token
app.post('/api/auth/signup', async (req, res) => {
    const { username, password } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const user = new User({ username, password: hashedPassword });
        await user.save();

        const token = createToken(user._id);
        res.status(201).json({ user: user.username, token });
    } catch (err) {
        if (err.code === 11000) { 
            return res.status(400).json({ message: 'Username already exists.' });
        }
        res.status(400).json({ message: 'Error signing up: ' + err.message });
    }
});

// POST /api/auth/login - Checks credentials and returns a token
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        const token = createToken(user._id);
        res.status(200).json({ user: user.username, token });
    } catch (err) {
        res.status(500).json({ message: 'Error logging in.' });
    }
});


// PROTECTED RECORD ROUTES (Requires requireAuth middleware)

// GET /api/records: Retrieve ONLY the current user's records
app.get('/api/records', requireAuth, async (req, res) => {
    try {
        // Fetches records filtered by the authenticated user's ID
        const records = await Record.find({ userId: req.user_id }).sort({ createdAt: -1 });
        res.status(200).json(records); 
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving records: ' + err.message });
    }
});

// POST /api/records: Create a new record for the current user
app.post('/api/records', requireAuth, async (req, res) => {
    const record = new Record({
        type: req.body.type,
        name: req.body.name,
        idNumber: req.body.idNumber,
        password: req.body.password, 
        notes: req.body.notes,
        userId: req.user_id, // Assign the authenticated user's ID
    });

    try {
        const newRecord = await record.save();
        res.status(201).json(newRecord); 
    } catch (err) {
        res.status(400).json({ message: 'Error saving record: ' + err.message });
    }
});

// DELETE /api/records/:id: Delete a record, ensuring it belongs to the user
app.delete('/api/records/:id', requireAuth, async (req, res) => {
    try {
        // Find and delete ONLY if both the ID and the userId match
        const result = await Record.findOneAndDelete({ 
            _id: req.params.id, 
            userId: req.user_id 
        }); 

        if (!result) return res.status(404).json({ message: 'Record not found or user unauthorized.' });
        res.json({ message: 'Record successfully deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting record: ' + err.message });
    }
});


// --- 4. Start the Server ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
