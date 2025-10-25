// backend/server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs'); // For hashing passwords
const jwt = require('jsonwebtoken'); // For creating auth tokens

// --- Database Connection Pool ---
// We use the db.js file you already have
const pool = require('./db'); 

// --- Authentication Middleware ---
// This function will protect our routes
const authMiddleware = (req, res, next) => {
    // Get the token from the Authorization header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format is "Bearer TOKEN"

    if (token == null) {
        // No token provided
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            // Token is invalid or expired
            return res.status(403).json({ message: 'Invalid token.' });
        }
        
        // Token is valid, add the user payload to the request object
        req.user = user;
        next(); // Move on to the actual route
    });
};

// --- App Setup ---
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Allow cross-origin requests
app.use(express.json()); // Allow app to parse JSON in request bodies

// --- API ROUTES ---

// --- 1. Authentication Routes (Public) ---
// These match the new frontend/index.html

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: 'All fields are required.' });
    }

    try {
        // Check if user already exists
        const [existingUser] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(409).json({ message: 'Email is already in use.' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert new user into the database
        await pool.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashedPassword]);
        
        res.status(201).json({ message: 'User registered successfully!' });

    } catch (error) {
        console.error('Registration Error:', error);
        res.status(500).json({ message: 'Server error during registration.' });
    }
});

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        // Find the user by email
        const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const user = users[0];

        // Compare the provided password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // Create a JWT token
        const payload = {
            user: {
                id: user.id,
                email: user.email,
                username: user.username
            }
        };

        const token = jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: '1h' // Token expires in 1 hour
        });

        // Send the token and user info (without password) back to the client
        // This is what the new frontend expects
        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username
            }
        });

    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});


// --- 2. Application Routes (Protected) ---
// We use our 'authMiddleware' here. Only logged-in users can access these.

// POST /api/recommend
app.post('/api/recommend', authMiddleware, async (req, res) => {
    const { nitrogen, phosphorus, potassium, ph, rainfall, temperature, soil_type } = req.body;
    
    // Log who is making the request
    console.log(`Recommendation request received from user: ${req.user.user.email}`);

    if (!nitrogen || !phosphorus || !potassium || !ph || !rainfall || !temperature || !soil_type) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    try {
        const [rows] = await pool.query(`
            SELECT name, soil_type FROM crops
            WHERE 
                ? BETWEEN nitrogen_min AND nitrogen_max AND
                ? BETWEEN phosphorus_min AND phosphorus_max AND
                ? BETWEEN potassium_min AND potassium_max AND
                ? BETWEEN ph_min AND ph_max AND
                ? BETWEEN rainfall_min AND rainfall_max AND
                ? BETWEEN temperature_min AND temperature_max AND
                soil_type = ?
        `, [nitrogen, phosphorus, potassium, ph, rainfall, temperature, soil_type]);

        if (rows.length > 0) {
            res.json({ success: true, recommended_crop: rows[0].name, soil_type: rows[0].soil_type });
        } else {
            res.json({ success: false, message: 'No suitable crop found based on your input.' });
        }
    } catch (error) {
        console.error('Database query error:', error);
        res.status(500).json({ success: false, message: 'Server error. Please try again later.' });
    }
});

// GET /api/schemes/:state
app.get('/api/schemes/:state', authMiddleware, (req, res) => {
    const state = req.params.state.toLowerCase();
    
    // Log who is making the request
    console.log(`Scheme request for ${state} from user: ${req.user.user.email}`);

    const schemes = {
        'maharashtra': [
            { name: 'Dr. Panjabrao Deshmukh Krishi Sanjivani Yojana', details: 'A scheme to provide financial assistance for soil conservation and water management.' },
            { name: 'Mukhyamantri Saur Krushi Pump Yojana', details: 'Provides subsidized solar pumps to farmers to reduce electricity costs.' }
        ],
        'punjab': [
            { name: 'Mera Pani Meri Virasat', details: 'A scheme to encourage crop diversification and shift from water-intensive crops like paddy.' },
            { name: 'Punjab Crop Diversification Programme', details: 'Financial support for farmers to grow alternative crops.' }
        ],
        'default': [
            { name: 'Pradhan Mantri Fasal Bima Yojana', details: 'Provides crop insurance against natural calamities.' },
            { name:'Kisan Credit Card (KCC) Scheme', details: 'Offers short-term credit to farmers for agricultural needs.'}
        ]
    };
    res.json(schemes[state] || schemes['default']);
});


// --- Start Server ---
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

// Export the app for testing purposes
module.exports = app;