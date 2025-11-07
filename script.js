// script.js - FINAL VERSION WITH AUTHENTICATION

// 1. CONFIGURATION
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
// CRITICAL: YOUR LIVE RENDER URL
const RENDER_URL = 'https://personal-data-api.onrender.com'; 
// >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>
const API_BASE_URL = `${RENDER_URL}/api/records`;
const AUTH_URL_BASE = `${RENDER_URL}/api/auth`;

// 2. DOM ELEMENTS
const dashboardContainer = document.getElementById('mainDashboard');
const authContainer = document.getElementById('authContainer');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const recordsList = document.getElementById('recordsList');
const addRecordForm = document.getElementById('addRecordForm');
const authMessage = document.getElementById('authMessage');

// --- Helper Functions ---

// Attaches the JWT token to the request header
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    if (!token) {
        return {};
    }
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` // The format the server expects
    };
};

// Shows error message on the screen
const showAuthError = (message) => {
    authMessage.textContent = message;
    authMessage.classList.remove('d-none');
    setTimeout(() => authMessage.classList.add('d-none'), 4000); // 4 seconds
};

// Controls which UI section is visible
const toggleUI = (isAuthenticated) => {
    if (isAuthenticated) {
        authContainer.style.display = 'none';
        dashboardContainer.style.display = 'block';
        fetchRecords(); // Load data only after login
    } else {
        authContainer.style.display = 'block';
        dashboardContainer.style.display = 'none';
        localStorage.removeItem('token'); // Clear token on logout
    }
};


// --- Authentication Logic ---

const handleAuth = async (endpoint, formData) => {
    try {
        const response = await fetch(`${AUTH_URL_BASE}/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || `Authentication failed.`);
        }

        // Success: Store the token and show the dashboard
        localStorage.setItem('token', data.token);
        toggleUI(true); // User is now logged in

    } catch (error) {
        console.error(`Error during ${endpoint}:`, error);
        showAuthError(error.message);
    }
};

// --- Record Management Logic (UPDATED to include Token) ---

const fetchRecords = async () => {
    try {
        const response = await fetch(API_BASE_URL, {
            headers: getAuthHeaders(), // Sending token
        });

        if (response.status === 401) {
            // Token expired or invalid: force logout
            toggleUI(false);
            return;
        }

        const records = await response.json();
        renderRecords(records);
    } catch (error) {
        console.error("Error fetching records:", error);
        // Do not alert, as the 401 unauth will handle it silently
    }
};

const renderRecords = (records) => {
    recordsList.innerHTML = '';
    if (records.length === 0) {
        recordsList.innerHTML = '<p class="text-muted">No records found. Add one above!</p>';
        return;
    }
    // ... (Your existing rendering logic)
    records.forEach(record => {
        const card = document.createElement('div');
        card.className = 'col-md-4 mb-4';
        card.innerHTML = `
            <div class="card shadow-sm h-100">
                <div class="card-body">
                    <h5 class="card-title">${record.name}</h5>
                    <p class="card-text text-muted">${record.type}</p>
                    <ul class="list-unstyled small">
                        <li><strong>ID/Number:</strong> ${record.idNumber}</li>
                        <li><strong>Password:</strong> ${record.password || 'N/A'}</li>
                        <li><strong>Notes:</strong> ${record.notes || 'None'}</li>
                    </ul>
                    <button class="btn btn-danger btn-sm" onclick="deleteRecord('${record._id}')">Delete</button>
                </div>
            </div>
        `;
        recordsList.appendChild(card);
    });
};

const handleAddRecord = async (e) => {
    e.preventDefault();

    const formData = {
        type: document.getElementById('recordType').value,
        name: document.getElementById('recordName').value,
        idNumber: document.getElementById('recordId').value,
        password: document.getElementById('recordPassword').value,
        notes: document.getElementById('recordNotes').value,
    };

    try {
        const response = await fetch(API_BASE_URL, {
            method: 'POST',
            headers: getAuthHeaders(), // Sending token
            body: JSON.stringify(formData),
        });

        if (!response.ok) {
            if (response.status === 401) {
                toggleUI(false);
                alert("Session expired. Please log in again.");
                return;
            }
            throw new Error("Failed to save record.");
        }

        // Success
        addRecordForm.reset();
        fetchRecords();

    } catch (error) {
        console.error("Error saving record:", error);
        alert(error.message);
    }
};

const deleteRecord = async (id) => {
    if (!confirm('Are you sure you want to delete this record?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders(), // Sending token
        });

        if (!response.ok) {
            if (response.status === 401) toggleUI(false);
            throw new Error("Failed to delete record.");
        }

        fetchRecords();
    } catch (error) {
        console.error("Error deleting record:", error);
        alert(error.message);
    }
};

const handleLogout = () => {
    toggleUI(false);
    alert("You have been logged out.");
};


// --- Event Listeners and Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    // Check for existing token on page load
    const token = localStorage.getItem('token');
    if (token) {
        toggleUI(true);
    } else {
        toggleUI(false);
    }

    // Auth Form Submission Handlers
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        handleAuth('login', { username, password });
    });

    signupForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const username = document.getElementById('signupUsername').value;
        const password = document.getElementById('signupPassword').value;
        handleAuth('signup', { username, password });
    });

    // Toggle between login and signup views
    document.getElementById('showSignup').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('loginCard').style.display = 'none';
        document.getElementById('signupCard').style.display = 'block';
    });

    document.getElementById('showLogin').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('signupCard').style.display = 'none';
        document.getElementById('loginCard').style.display = 'block';
    });

    // Dashboard Form Handlers
    addRecordForm.addEventListener('submit', handleAddRecord);
    document.getElementById('logoutButton').addEventListener('click', handleLogout);
});
