// server.js - FINAL DEPLOYABLE VERSION

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path'); // <<< NEW LINE: Required for Express to serve static files correctly

// Load environment variables (like MONGO_URI) from the .env file
dotenv.config(); 

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// --- Middleware ---
app.use(cors());
app.use(express.json()); 


// =========================================================================
// <<< NEW SECTION TO FIX "Cannot GET /" ERROR >>>
// --- 0. Serve Static Files (The Frontend) ---
// This tells Express to look in the current directory (where server.js is) 
// for static files (index.html, style.css, script.js) 
// and serves index.html automatically when a user visits the root ('/')
app.use(express.static(path.join(__dirname, '/'))); 
// =========================================================================


// --- 1. Database Connection ---
mongoose.connect(MONGO_URI)
    .then(() => console.log('MongoDB connection successful!'))
    .catch(err => console.error('MongoDB connection error:', err));

// --- 2. Data Model (Schema) ---
const RecordSchema = new mongoose.Schema({
    type: { type: String, required: true },
    name: { type: String, required: true },
    idNumber: { type: String, required: true },
    password: { type: String, default: '' }, 
    notes: { type: String },
    createdAt: { type: Date, default: Date.now }
});

const Record = mongoose.model('Record', RecordSchema);


// --- 3. API Routes (CRUD Operations) ---

// GET /api/records: Retrieve all records
app.get('/api/records', async (req, res) => {
    try {
        const records = await Record.find().sort({ createdAt: -1 });
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
        res.status(201).json(newRecord); 
    } catch (err) {
        res.status(400).json({ message: 'Error saving record: ' + err.message });
    }
});

// DELETE /api/records/:id: Delete a record by its MongoDB ID
app.delete('/api/records/:id', async (req, res) => {
    try {
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
