// oath.js

// --- Configuration ---
const BACKEND_BASE_URL = "http://localhost:3000"; // Replace with your actual backend URL
const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vToqj0JglDOwG_PdfpqiBTA76JnJO9AY38FNnpudB_YevYjhriY6oZbthJeUfqbkPbOdDxf8Aa4R9__/pub?gid=1502637795&single=true&output=csv";

// --- Global State ---
let userSessionToken = null;
let currentUserId = null;
let currentSubcategoryId = null;
let spreadsheetData = []; // To store the parsed CSV data

// --- UI Update Callbacks (defined in index.html, exposed globally) ---
// These functions are expected to be available in the global scope from index.html
// and will be called by oath.js to update the UI.
let updateUIForLoggedInUser;
let updateUIForLoggedOutUser;
let showSubcategoryForm;
let clearSubcategoryForm;
let displaySpreadsheetDataFromDOMSubcategories; // Added for spreadsheet data display

// --- Helper Functions ---
function getSessionToken() {
    return localStorage.getItem('sessionToken');
}

function setSessionToken(token) {
    localStorage.setItem('sessionToken', token);
    userSessionToken = token;
}

function clearSessionToken() {
    localStorage.removeItem('sessionToken');
    userSessionToken = null;
}

function getUserId() {
    return localStorage.getItem('userId');
}

function setUserId(id) {
    localStorage.setItem('userId', id);
    currentUserId = id;
}

function clearUserId() {
    localStorage.removeItem('userId');
    currentUserId = null;
}

function getCurrentSubcategoryId() {
    return currentSubcategoryId;
}

function setCurrentSubcategoryId(id) {
    currentSubcategoryId = id;
}

// Simple CSV parser
function parseCSV(csv) {
    const lines = csv.split('\n');
    const data = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
            data.push(line.split(',').map(cell => cell.trim()));
        }
    }
    return data;
}

// Function to fetch and parse the CSV data
async function fetchSpreadsheetData() {
    try {
        const response = await fetch(SPREADSHEET_URL);
        const csvText = await response.text();
        spreadsheetData = parseCSV(csvText);
        console.log("Spreadsheet data loaded:", spreadsheetData);
    } catch (error) {
        console.error("Error fetching or parsing spreadsheet data:", error);
        document.getElementById('spreadsheet-content').innerHTML = '<p style="color: red;">Greška pri učitavanju podataka iz spreadsheeta.</p>';
    }
}


// --- Google Sign-In (GSI) Functions ---

// Callback for Google's GSI client when a credential response is received
async function handleCredentialResponse(response) {
    if (response.credential) {
        try {
            const res = await fetch(`${BACKEND_BASE_URL}/api/auth/google`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token: response.credential })
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || 'Authentication failed');
            }

            const data = await res.json();
            setSessionToken(data.token);
            setUserId(data.user.id);

            // Update UI after successful login
            if (typeof updateUIForLoggedInUser === 'function') {
                updateUIForLoggedInUser(data.user.name, data.user.picture);
            } else {
                console.error("updateUIForLoggedInUser is not defined.");
            }

        } catch (error) {
            console.error("Login failed:", error);
            document.getElementById('message').textContent = `Greška pri prijavi: ${error.message}`;
            if (typeof updateUIForLoggedOutUser === 'function') {
                updateUIForLoggedOutUser();
            }
        }
    }
}

// Function to sign out the user
function signOutUser() {
    clearSessionToken();
    clearUserId();
    if (typeof updateUIForLoggedOutUser === 'function') {
        updateUIForLoggedOutUser();
    }
    // Revoke Google session (optional, but good practice)
    if (google.accounts.id) {
        google.accounts.id.disableAutoSelect();
    }
}

// --- Backend Communication Functions ---

async function fetchWithAuth(url, options = {}) {
    const token = getSessionToken();
    if (!token) {
        document.getElementById('message').textContent = "Niste prijavljeni. Molimo prijavite se ponovo.";
        signOutUser();
        throw new Error("No authentication token found.");
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
    };

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401) { // Unauthorized, token might be expired
        document.getElementById('message').textContent = "Vaša sesija je istekla. Molimo prijavite se ponovo.";
        signOutUser();
        throw new Error("Session expired.");
    }

    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Backend operation failed');
    }

    return res.json();
}

async function saveMainData() {
    if (!getUserId()) return;

    const data = {
        input1: document.getElementById('input1').value,
        input2: document.getElementById('input2').value,
        largeTextInput: document.getElementById('large-text-input').value,
        input3: document.getElementById('input3').value,
        input4: document.getElementById('input4').value,
        input5: document.getElementById('input5').value,
        dropdownInput: document.getElementById('dropdown-input').value,
        sidebarLargeTextInput2: document.getElementById('sidebar-large-text-input-2').value,
        sidebarLargeTextInput3: document.getElementById('sidebar-large-text-input-3').value
    };

    try {
        await fetchWithAuth(`${BACKEND_BASE_URL}/api/users/${getUserId()}/data`, {
            method: 'POST', // or PUT if always updating
            body: JSON.stringify(data)
        });
        document.getElementById('message').textContent = "Podaci uspješno spremljeni!";
    } catch (error) {
        console.error("Error saving main data:", error);
        document.getElementById('message').textContent = `Greška pri spremanju podataka: ${error.message}`;
    }
}

async function loadMainData() {
    if (!getUserId()) return;

    try {
        const data = await fetchWithAuth(`${BACKEND_BASE_URL}/api/users/${getUserId()}/data`);
        document.getElementById('input1').value = data.input1 || '';
        document.getElementById('input2').value = data.input2 || '';
        document.getElementById('large-text-input').value = data.largeTextInput || '';
        document.getElementById('input3').value = data.input3 || '';
        document.getElementById('input4').value = data.input4 || '';
        document.getElementById('input5').value = data.input5 || '';
        document.getElementById('dropdown-input').value = data.dropdownInput || '';
        document.getElementById('sidebar-large-text-input-2').value = data.sidebarLargeTextInput2 || '';
        document.getElementById('sidebar-large-text-input-3').value = data.sidebarLargeTextInput3 || '';
        document.getElementById('message').textContent = "Podaci uspješno učitani!";
    } catch (error) {
        console.error("Error loading main data:", error);
        document.getElementById('message').textContent = `Greška pri učitavanju podataka: ${error.message}`;
    }
}

async function loadSubcategoriesFromBackend(reselect = false) {
    if (!getUserId()) return;

    try {
        const subcategories = await fetchWithAuth(`${BACKEND_BASE_URL}/api/users/${getUserId()}/subcategories`);
        const subcategoryList = document.getElementById('subcategory-list');
        subcategoryList.innerHTML = ''; // Clear existing list

        if (subcategories.length === 0) {
            subcategoryList.innerHTML = '<p>Nema kreiranih potkategorija.</p>';
            document.getElementById('subcategory-message').textContent = "";
            return;
        }

        subcategories.forEach(subcategory => {
            const li = document.createElement('li');
            li.className = 'subcategory-list-item';
            li.setAttribute('data-id', subcategory.id);
            li.textContent = subcategory.name;
            li.addEventListener('click', () => {
                selectSubcategory(subcategory.id);
            });
            subcategoryList.appendChild(li);
        });

        document.getElementById('subcategory-message').textContent = "Potkategorije uspješno učitane.";

        if (reselect && currentSubcategoryId) {
            selectSubcategory(currentSubcategoryId);
        } else if (subcategories.length > 0 && !currentSubcategoryId) {
             // If no subcategory is selected, but there are subcategories, select the first one
             selectSubcategory(subcategories[0].id);
        } else if (subcategories.length > 0 && currentSubcategoryId) {
            // Ensure the previously selected one is still highlighted if it exists
            const selectedItem = document.querySelector(`.subcategory-list-item[data-id="${currentSubcategoryId}"]`);
            if (selectedItem) {
                selectedItem.classList.add('selected');
            }
        }

        // After loading subcategories (which update the DOM), try to display spreadsheet data
        if (typeof displaySpreadsheetDataFromDOMSubcategories === 'function') {
             setTimeout(displaySpreadsheetDataFromDOMSubcategories, 50); // Small delay to allow DOM to render
        } else {
            console.warn("displaySpreadsheetDataFromDOMSubcategories is not defined.");
        }


    } catch (error) {
        console.error("Error loading subcategories:", error);
        document.getElementById('subcategory-message').textContent = `Greška pri učitavanju potkategorija: ${error.message}`;
        document.getElementById('subcategory-list').innerHTML = '<p style="color: red;">Greška pri učitavanju potkategorija.</p>';
    }
}

async function loadSubcategoryDetailsFromBackend(subcategoryId) {
    if (!getUserId()) return;
    if (!subcategoryId) {
        console.error("No subcategory ID provided for loading details.");
        return;
    }

    try {
        const subcategory = await fetchWithAuth(`${BACKEND_BASE_URL}/api/users/${getUserId()}/subcategories/${subcategoryId}`);
        if (typeof showSubcategoryForm === 'function') {
            showSubcategoryForm(subcategory);
        } else {
            console.error("showSubcategoryForm is not defined.");
        }
        document.getElementById('subcategory-message').textContent = `Detalji potkategorije "${subcategory.name}" učitani.`;
    } catch (error) {
        console.error("Error loading subcategory details:", error);
        document.getElementById('subcategory-message').textContent = `Greška pri učitavanju detalja potkategorije: ${error.message}`;
        if (typeof clearSubcategoryForm === 'function') {
            clearSubcategoryForm();
        }
    }
}

async function saveSubcategory(subcategoryData, isNew, subcategoryId = null) {
    if (!getUserId()) return;

    let url = `${BACKEND_BASE_URL}/api/users/${getUserId()}/subcategories`;
    let method = 'POST';

    if (!isNew && subcategoryId) {
        url = `${url}/${subcategoryId}`;
        method = 'PUT';
    } else if (!isNew && !subcategoryId) {
        document.getElementById('subcategory-message').textContent = "Greška: ID potkategorije nije dostupan za ažuriranje.";
        return;
    }

    try {
        const response = await fetchWithAuth(url, {
            method: method,
            body: JSON.stringify(subcategoryData)
        });

        document.getElementById('subcategory-message').textContent = isNew ? "Potkategorija uspješno kreirana!" : "Potkategorija uspješno ažurirana!";
        if (typeof clearSubcategoryForm === 'function') {
            clearSubcategoryForm();
        }
        document.getElementById('subcategory-form').style.display = 'none';
        setCurrentSubcategoryId(response.id); // Update current selected subcategory ID
        loadSubcategoriesFromBackend(true); // Reload list and reselect
    } catch (error) {
        console.error("Error saving subcategory:", error);
        document.getElementById('subcategory-message').textContent = `Greška pri spremanju potkategorije: ${error.message}`;
    }
}

async function deleteSubcategory(subcategoryId) {
    if (!getUserId()) return;
    if (!subcategoryId || subcategoryId === 'Nova') {
        document.getElementById('subcategory-message').textContent = "Nema odabrane potkategorije za brisanje.";
        return;
    }

    if (!confirm(`Jeste li sigurni da želite obrisati potkategoriju s ID-em: ${subcategoryId}?`)) {
        return;
    }

    try {
        await fetchWithAuth(`${BACKEND_BASE_URL}/api/users/${getUserId()}/subcategories/${subcategoryId}`, {
            method: 'DELETE'
        });

        document.getElementById('subcategory-message').textContent = "Potkategorija uspješno obrisana!";
        if (typeof clearSubcategoryForm === 'function') {
            clearSubcategoryForm();
        }
        document.getElementById('subcategory-form').style.display = 'none';
        setCurrentSubcategoryId(null); // Clear current selected subcategory ID
        loadSubcategoriesFromBackend(); // Reload list
    } catch (error) {
        console.error("Error deleting subcategory:", error);
        document.getElementById('subcategory-message').textContent = `Greška pri brisanju potkategorije: ${error.message}`;
    }
}

// --- Expose functions globally for index.html to use ---
window.handleCredentialResponse = handleCredentialResponse;
window.signOutUser = signOutUser;
window.saveMainData = saveMainData;
window.loadMainData = loadMainData;
window.loadSubcategoriesFromBackend = loadSubcategoriesFromBackend;
window.loadSubcategoryDetailsFromBackend = loadSubcategoryDetailsFromBackend;
window.saveSubcategory = saveSubcategory;
window.deleteSubcategory = deleteSubcategory;
window.getCurrentSubcategoryId = getCurrentSubcategoryId;
window.setCurrentSubcategoryId = setCurrentSubcategoryId;
window.fetchSpreadsheetData = fetchSpreadsheetData; // Expose spreadsheet fetcher
window.spreadsheetData = spreadsheetData; // Expose parsed data array

// Ensure GSI client is initialized on load
window.onload = () => {
    // Attempt to re-authenticate from session token
    const token = getSessionToken();
    const userId = getUserId();
    if (token && userId) {
        // Assume user is logged in, attempt to fetch user details from backend
        // In a real app, you'd probably have an endpoint like /api/user/me
        // that validates the token and returns user info.
        fetchWithAuth(`${BACKEND_BASE_URL}/api/users/${userId}`)
            .then(userData => {
                if (typeof updateUIForLoggedInUser === 'function') {
                    updateUIForLoggedInUser(userData.name, userData.picture);
                }
            })
            .catch(error => {
                console.warn("Session token found, but failed to re-authenticate:", error);
                if (typeof updateUIForLoggedOutUser === 'function') {
                    updateUIForLoggedOutUser();
                }
            });
    } else {
        if (typeof updateUIForLoggedOutUser === 'function') {
            updateUIForLoggedOutUser();
        }
    }
};
