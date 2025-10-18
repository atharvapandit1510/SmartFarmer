// backend/server.js
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from a .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files from the 'frontend' directory
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/auth', express.static(path.join(__dirname, '../frontend/auth')));

// Database Connection Pool
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

// Test Database Connection
pool.getConnection()
    .then(connection => {
        console.log('Database connection successful!');
        connection.release();
    })
    .catch(err => {
        console.error('Database connection failed:', err);
    });

// API Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/auth/signin.html'));
});

// The core recommendation API endpoint
app.post('/api/recommend', async (req, res) => {
    const { nitrogen, phosphorus, potassium, ph, rainfall, temperature, soil_type } = req.body;
    
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

// New API route for government schemes
app.get('/api/schemes/:state', (req, res) => {
    const state = req.params.state.toLowerCase();
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
            { name: 'Kisan Credit Card (KCC) Scheme', details: 'Offers short-term credit to farmers for agricultural needs.' }
        ]
    };
    res.json(schemes[state] || schemes['default']);
});

// Start the server
app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

module.exports = app;
