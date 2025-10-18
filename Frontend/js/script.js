// This is a placeholder for your Firebase config.
// Replace this with your actual Firebase project configuration.
const firebaseConfig = {
    apiKey: "AIzaSyDtckP71SvlocMLZiFpl52o0SjaRFqgK4k",
    authDomain: "agrimitra-f8b11.firebaseapp.com",
    projectId: "agrimitra-f8b11",
    storageBucket: "agrimitra-f8b11.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const weatherApiKey = "e8e979366f4424844abc17afe58aa8fe"; // Replace with your key

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const userStatusElement = document.getElementById('user-info');
const signOutBtn = document.getElementById('sign-out-btn');
const appContent = document.getElementById('app-content');
const recommendationResult = document.getElementById('recommendation-result');
const schemesList = document.getElementById('schemes-list');

// Listen for authentication state changes
onAuthStateChanged(auth, async (user) => {
    if (user) {
        userStatusElement.textContent = `Welcome, ${user.email}!`;
        signOutBtn.style.display = 'block';
        appContent.style.display = 'block';
        
        // Load user's past recommendations or other data from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
            console.log("User data:", userDoc.data());
        }
    } else {
        window.location.href = 'auth/signin.html';
    }
});

// Sign out button functionality
signOutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
        window.location.href = 'auth/signin.html';
    } catch (error) {
        console.error("Error signing out:", error);
    }
});

// Handle the crop recommendation form submission
document.getElementById('crop-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const form = e.target;
    const data = {
        soil_type: form.soil_type.value,
        ph: parseFloat(form.ph.value),
        nitrogen: parseFloat(form.nitrogen.value),
        phosphorus: parseFloat(form.phosphorus.value),
        potassium: parseFloat(form.potassium.value),
        rainfall: parseFloat(form.rainfall.value),
        temperature: parseFloat(form.temperature.value)
    };
    
    recommendationResult.innerHTML = '<p>Loading...</p>';

    try {
        const response = await fetch('http://localhost:3000/api/recommend', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (response.status === 200 && result.success) {
            recommendationResult.innerHTML = `<p>✅ **Recommended Crop:** ${result.recommended_crop}</p><p>Optimal for your soil type: ${result.soil_type}</p>`;
            
            // Save the recommendation to Firestore for the user
            const user = auth.currentUser;
            if (user) {
                const recommendationRef = collection(db, 'users', user.uid, 'recommendations');
                await setDoc(doc(recommendationRef), {
                    date: new Date(),
                    input: data,
                    recommendation: result.recommended_crop
                });
            }
        } else {
            recommendationResult.innerHTML = `<p>❌ ${result.message}</p>`;
        }
    } catch (err) {
        console.error('Error:', err);
        recommendationResult.innerHTML = `<p>An error occurred. Please ensure your backend server is running and try again later.</p>`;
    }
});

// Handle getting government schemes based on state
document.getElementById('get-schemes-btn').addEventListener('click', async () => {
    const stateInput = document.getElementById('state-input').value;
    if (!stateInput) {
        schemesList.innerHTML = `<p>Please enter a state.</p>`;
        return;
    }

    try {
        const response = await fetch(`http://localhost:3000/api/schemes/${stateInput}`);
        const schemes = await response.json();

        if (schemes.length > 0) {
            schemesList.innerHTML = schemes.map(scheme => `
                <div class="scheme-item">
                    <h3>${scheme.name}</h3>
                    <p>${scheme.details}</p>
                </div>
            `).join('');
        } else {
            schemesList.innerHTML = `<p>No specific schemes found for ${stateInput}. Displaying general schemes.</p>`;
        }
    } catch (err) {
        console.error('Error fetching schemes:', err);
        schemesList.innerHTML = `<p>An error occurred while fetching schemes.</p>`;
    }
});
