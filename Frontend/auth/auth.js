const handleAuth = async (url, email, password) => {
    const authMessage = document.getElementById('auth-message');
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const result = await response.json();

        if (response.ok && result.success) {
            if (result.token) { // Sign in
                localStorage.setItem('agri_mitra_token', result.token);
                window.location.href = '../index.html';
            } else { // Sign up
                authMessage.textContent = 'Account created! Please sign in.';
                authMessage.style.color = 'green';
                setTimeout(() => {
                    window.location.href = 'signin.html';
                }, 2000);
            }
        } else {
            authMessage.textContent = `Error: ${result.message}`;
            authMessage.style.color = 'red';
        }
    } catch (error) {
        authMessage.textContent = `Error: ${error.message}`;
        authMessage.style.color = 'red';
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const authForm = document.getElementById('auth-form');

    if (window.location.pathname.includes('signin.html')) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            handleAuth('http://localhost:3000/api/auth/signin', email, password);
        });
    }

    if (window.location.pathname.includes('signup.html')) {
        authForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            handleAuth('http://localhost:3000/api/auth/signup', email, password);
        });
    }
});
