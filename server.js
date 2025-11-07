// server.js - FINAL CODE WITH DATABASE INTEGRATION

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables (like MONGO_URI) from the .env file
dotenv.config(); 

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// --- Middleware ---
// 1. Enable CORS so the frontend (index.html) can talk to this server
app.use(cors());
// 2. Parse incoming JSON payloads (needed for POST requests)
app.use(express.json()); 

// --- 1. Database Connection ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connection successful!'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- 2. Data Model (Schema) ---
// Defines the structure and data types for documents in the 'records' collection
const RecordSchema = new mongoose.Schema({
    type: { type: String, required: true },       // e.g., 'Scholarship', 'Certificate'
    name: { type: String, required: true },       // e.g., 'K-12 Scholarship'
    idNumber: { type: String, required: true },   // The unique ID or number
    password: { type: String, default: '' },      // The sensitive data (stored as plain text for this simple demo)
    notes: { type: String },
    createdAt: { type: Date, default: Date.now }
});

// Creates the Mongoose Model, which interacts with the 'records' collection in MongoDB
const Record = mongoose.model('Record', RecordSchema);


// --- 3. API Routes (CRUD Operations) ---

// GET /api/records: Retrieve all records
app.get('/api/records', async (req, res) => {
    try {
        const records = await Record.find().sort({ createdAt: -1 });
        // NOTE: In a real app, you would ONLY send back data associated with the authenticated user.
        res.status(200).json(records); 
    } catch (err) {
        res.status(500).json({ message: 'Error retrieving records: ' + err.message });
    }
});

// POST /api/records: Create a new record
app.post('/api/records', async (req, res) => {
    const record = new Record({
        type: req.body.type,
        name: req.body.name,
        idNumber: req.body.idNumber,
        password: req.body.password, 
        notes: req.body.notes
    });

    try {
        const newRecord = await record.save();
        res.status(201).json(newRecord); // 201 Created
    } catch (err) {
        res.status(400).json({ message: 'Error saving record: ' + err.message });
    }
});

// DELETE /api/records/:id: Delete a record by its MongoDB ID
app.delete('/api/records/:id', async (req, res) => {
    try {
        // Find by ID provided in the URL parameter and delete it
        const result = await Record.findByIdAndDelete(req.params.id); 
        if (!result) return res.status(404).json({ message: 'Record not found' });
        res.json({ message: 'Record successfully deleted' });
    } catch (err) {
        res.status(500).json({ message: 'Error deleting record: ' + err.message });
    }
});


// --- 4. Start the Server ---
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open your frontend index.html now!`);
});