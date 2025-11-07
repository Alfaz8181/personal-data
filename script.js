document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('recordForm');
    const recordsContainer = document.getElementById('recordsContainer');
    const noRecords = document.getElementById('noRecords');

    // --- Configuration ---
    const API_BASE_URL = 'http://localhost:3000/api/records';
    let records = []; // Records will now be managed by the server

    // --- Core Functions ---

    /**
     * Replaces localStorage loading. Fetches records from the server.
     */
    const fetchRecords = async () => {
        try {
            noRecords.style.display = 'block'; // Show loading or placeholder initially
            
            const response = await fetch(API_BASE_URL);
            
            if (!response.ok) {
                // If the response is not 2xx, throw an error
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }

            // Replace local records array with data from the server
            records = await response.json(); 
            renderRecords(); // Render the fetched data
            
        } catch (error) {
            console.error("Error fetching records:", error);
            // Display an error message to the user
            recordsContainer.innerHTML = '<div class="alert alert-danger" role="alert">Could not load records. Is the backend server running?</div>';
            noRecords.style.display = 'none';
        }
    };

    /**
     * Renders all records as interactive Bootstrap cards. (No change from original logic)
     */
    const renderRecords = () => {
        recordsContainer.innerHTML = ''; 
        
        if (records.length === 0) {
            noRecords.style.display = 'block';
            return;
        }
        noRecords.style.display = 'none';

        records.forEach((record, index) => {
            // NOTE: In a real app, 'index' for DOM manipulation should be the record's unique ID from the database (e.g., record._id).
            // For this example, we'll continue using array index, but keep the unique ID concept in mind.
            const cardHTML = createRecordCard(record, index); 
            recordsContainer.insertAdjacentHTML('beforeend', cardHTML);
        });

        document.querySelectorAll('.delete-record').forEach(button => {
            button.addEventListener('click', deleteRecord);
        });
        document.querySelectorAll('.toggle-password').forEach(button => {
            button.addEventListener('click', togglePasswordVisibility);
        });
    };
    
    // ... (createRecordCard function remains the same, assuming 'record' object structure) ...
    const createRecordCard = (record, index) => {
        // Use database ID if available, otherwise array index
        const id = record._id || index; 
        
        let typeClass = '';
        let badgeColor = 'secondary';
        switch (record.type) {
            case 'Scholarship':
                badgeColor = 'primary';
                typeClass = 'type-Scholarship';
                break;
            case 'Certificate':
                badgeColor = 'success';
                typeClass = 'type-Certificate';
                break;
            case 'Account':
                badgeColor = 'warning';
                typeClass = 'type-Account';
                break;
        }

        // IMPORTANT: In a real app, the server would never send the password back!
        // We are only masking here for demonstration purposes.
        const maskedPassword = record.password ? '••••••••' : 'N/A';
        const passwordButton = record.password ? 
            `<button class="btn btn-sm btn-outline-secondary toggle-password" data-id="${id}" type="button">Show</button>` : 
            `<span class="text-muted">N/A</span>`;

        return `
            <div class="col" data-id="${id}">
                <div class="card h-100 shadow-sm record-card ${typeClass}">
                    <div class="card-body">
                        <span class="badge bg-${badgeColor} float-end">${record.type}</span>
                        <h5 class="card-title">${record.name}</h5>
                        <hr>
                        <p class="card-text mb-1">
                            <strong>ID/Number:</strong> 
                            <span class="text-primary">${record.idNumber}</span>
                        </p>
                        <p class="card-text mb-1 d-flex justify-content-between align-items-center">
                            <strong>Password/Key:</strong> 
                            <span id="password-${id}" class="sensitive-data text-danger">${maskedPassword}</span>
                            ${passwordButton}
                        </p>
                        <p class="card-text mt-3 small text-muted">
                            <strong>Notes:</strong> ${record.notes || 'No notes provided.'}
                        </p>
                    </div>
                    <div class="card-footer bg-white border-0 text-end">
                        <button class="btn btn-sm btn-outline-danger delete-record" data-id="${id}">Delete</button>
                    </div>
                </div>
            </div>
        `;
    };


    // --- Event Handlers (Updated for Server Communication) ---

    /**
     * Handles form submission to ADD a new record (using POST).
     */
    const addRecord = async (e) => {
        e.preventDefault();

        const newRecordData = {
            type: form.recordType.value,
            name: form.recordName.value.trim(),
            idNumber: form.recordID.value.trim(),
            password: form.recordPassword.value.trim(), 
            notes: form.recordNotes.value.trim(),
        };

        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST', // HTTP method for creating data
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(newRecordData) // Send the data as JSON
            });

            if (response.ok) {
                // If successful (HTTP 201 Created), refresh the list
                form.reset();
                const collapseElement = document.getElementById('collapseForm');
                const bsCollapse = bootstrap.Collapse.getInstance(collapseElement);
                if (bsCollapse) {
                    bsCollapse.hide();
                }
                await fetchRecords(); // Reload data from the server
            } else {
                throw new Error('Failed to save record on the server.');
            }

        } catch (error) {
            console.error("Error adding record:", error);
            alert("Failed to save record. Check the server console.");
        }
    };

    /**
     * Handles DELETE request to remove a record (using DELETE).
     */
    const deleteRecord = async (e) => {
        // We use the data-id attribute which should be the database ID (e.g., MongoDB's _id)
        const recordId = e.target.dataset.id; 
        
        if (!confirm('Are you sure you want to delete this record? This action is permanent.')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/${recordId}`, {
                method: 'DELETE', // HTTP method for deleting data
            });

            if (response.ok) {
                // If successful, refresh the list
                await fetchRecords(); 
            } else {
                throw new Error('Failed to delete record on the server.');
            }
        } catch (error) {
            console.error("Error deleting record:", error);
            alert("Failed to delete record. Check the server console.");
        }
    };
    
    /**
     * Toggles the visibility of the password (remains client-side only)
     * NOTE: In a secure app, the password is NEVER sent back, so this function is removed or modified.
     * We keep it simple here, but acknowledge the security risk.
     */
    const togglePasswordVisibility = (e) => {
        const recordId = e.target.dataset.id;
        // Find the record object locally using the ID
        const record = records.find(r => r._id == recordId || r.id == recordId); 
        
        if (!record) return;

        const passwordSpan = document.getElementById(`password-${recordId}`);
        const button = e.target;
        const storedPassword = record.password;

        if (passwordSpan.textContent === '••••••••' || passwordSpan.textContent === 'N/A') {
            passwordSpan.textContent = storedPassword;
            button.textContent = 'Hide';
            button.classList.remove('btn-outline-secondary');
            button.classList.add('btn-secondary');
        } else {
            passwordSpan.textContent = '••••••••';
            button.textContent = 'Show';
            button.classList.remove('btn-secondary');
            button.classList.add('btn-outline-secondary');
        }
    };

    // --- Initialization ---
    form.addEventListener('submit', addRecord);
    fetchRecords(); // Initial load now calls the server
}
   

);

const API_BASE_URL = 'https://personal-data-api.onrender.com/api/records';
