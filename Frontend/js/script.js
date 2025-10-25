// --- CONFIGURATION ---
const weatherApiKey = "e8e979366f4424844abc17afe58aa8fe"; // Your OpenWeatherMap API key
const API_BASE_URL = 'http://localhost:3000/api';

// --- DOM ELEMENTS ---
const userStatusElement = document.getElementById('user-info');
const signOutBtn = document.getElementById('sign-out-btn');
const appContent = document.getElementById('app-content');
const recommendationResult = document.getElementById('recommendation-result');
const schemesList = document.getElementById('schemes-list');
const cropForm = document.getElementById('crop-form');
const getSchemesBtn = document.getElementById('get-schemes-btn');
const stateInput = document.getElementById('state-input');
const temperatureInput = document.getElementById('temperature');

/**
 * Fetches the current weather for a given city and populates the temperature field.
 * @param {string} city - The city name to fetch weather for.
 */
const fetchWeather = async (city = "Kalyan") => {
    if (!weatherApiKey) {
        console.warn("Weather API key is missing. Temperature field will not be auto-filled.");
        return;
    }
    try {
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${weatherApiKey}&units=metric`);
        if (!response.ok) {
            throw new Error('Weather data could not be fetched.');
        }
        const weatherData = await response.json();
        const temp = weatherData.main.temp;
        if (temperatureInput) {
            temperatureInput.value = temp.toFixed(1);
        }
    } catch (error) {
        console.error("Error fetching weather:", error);
    }
};

/**
 * Main function to initialize the application.
 */
constinitializeApp = () => {
    const token = localStorage.getItem('agri_mitra_token');

    // 1. Check for authentication token
    if (!token) {
        window.location.href = 'auth/signin.html';
        return; // Stop execution if not authenticated
    }

    // 2. Decode token to display user info and show content
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        userStatusElement.textContent = `Welcome, ${payload.email}!`;
        signOutBtn.style.display = 'block';
        appContent.style.display = 'block';
        fetchWeather(); // Fetch weather data on successful login
    } catch (e) {
        console.error("Invalid token:", e);
        localStorage.removeItem('agri_mitra_token');
        window.location.href = 'auth/signin.html';
        return;
    }

    // 3. Set up event listeners
    signOutBtn.addEventListener('click', () => {
        localStorage.removeItem('agri_mitra_token');
        window.location.href = 'auth/signin.html';
    });

    cropForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(cropForm);
        const data = {
            soil_type: formData.get('soil_type'),
            ph: parseFloat(formData.get('ph')),
            nitrogen: parseFloat(formData.get('nitrogen')),
            phosphorus: parseFloat(formData.get('phosphorus')),
            potassium: parseFloat(formData.get('potassium')),
            rainfall: parseFloat(formData.get('rainfall')),
            temperature: parseFloat(formData.get('temperature'))
        };
        
        recommendationResult.innerHTML = '<p>Loading...</p>';

        try {
            const response = await fetch(`${API_BASE_URL}/recommend`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (response.ok && result.success) {
                recommendationResult.innerHTML = `<p>✅ <strong>Recommended Crop:</strong> ${result.recommended_crop}</p><p>This crop is optimal for your soil type: ${result.soil_type}</p>`;
            } else {
                recommendationResult.innerHTML = `<p>❌ ${result.message || 'Could not find a recommendation.'}</p>`;
            }
        } catch (err) {
            console.error('Error:', err);
            recommendationResult.innerHTML = `<p>An error occurred. Please ensure your backend server is running and try again later.</p>`;
        }
    });

    getSchemesBtn.addEventListener('click', async () => {
        const state = stateInput.value;
        if (!state) {
            schemesList.innerHTML = `<p>Please enter a state.</p>`;
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/schemes/${state}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                throw new Error('Failed to fetch schemes.');
            }

            const schemes = await response.json();
            if (schemes.length > 0) {
                schemesList.innerHTML = schemes.map(scheme => `
                    <div class="scheme-item">
                        <h3>${scheme.name}</h3>
                        <p>${scheme.details}</p>
                    </div>
                `).join('');
            } else {
                schemesList.innerHTML = `<p>No specific schemes found for ${state}. Displaying general schemes.</p>`;
            }
        } catch (err) {
            console.error('Error fetching schemes:', err);
            schemesList.innerHTML = `<p>An error occurred while fetching schemes.</p>`;
        }
    });
};

// --- INITIALIZATION ---
// Wait for the DOM to be fully loaded before running the app logic.
document.addEventListener('DOMContentLoaded', initializeApp);

