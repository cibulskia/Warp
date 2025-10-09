// oauth.js
const BACKEND_URL = 'https://botanica.ngrok.app'; // Tvoja ngrok adresa

let googleIdToken = null;
let userName = null;
let userProfilePicUrl = null;

// Funkcija za inicijalizaciju Google One Tap-a (ako je potrebno, može se pozvati i iz index.html)
function initGoogleAuth() {
    // Nema direktne inicijalizacije ovde, jer Google GSI biblioteka radi automatski sa 'g_id_onload' divom
}

function handleCredentialResponse(response) {
    console.log("Encoded JWT ID token: " + response.credential);
    googleIdToken = response.credential;

    const tokenParts = googleIdToken.split('.');
    const payload = JSON.parse(atob(tokenParts[1]));
    userName = payload.name;
    userProfilePicUrl = payload.picture;

    fetch(`${BACKEND_URL}/verify-google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: googleIdToken })
    })
    .then(response => {
        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            console.log("Login successful on backend:", data);
            // Pozovi funkciju iz globalnog opsega index.html-a za ažuriranje UI-a
            if (typeof updateUIForLoggedInUser === 'function') {
                updateUIForLoggedInUser();
                loadSubcategories(); // Automatski učitaj potkategorije
                loadMainData();      // Automatski učitaj glavne podatke
            }
        } else {
            console.error("Backend login failed:", data.message);
            alert("Login failed: " + data.message);
            googleIdToken = null;
            userName = null;
            userProfilePicUrl = null;
            if (typeof updateUIForLoggedOutUser === 'function') {
                updateUIForLoggedOutUser();
            }
        }
    })
    .catch(error => {
        console.error("Error during backend login verification:", error);
        alert("An error occurred during login. Please try again.");
        googleIdToken = null;
        userName = null;
        userProfilePicUrl = null;
        if (typeof updateUIForLoggedOutUser === 'function') {
            updateUIForLoggedOutUser();
        }
    });
}

function signOut() {
    googleIdToken = null;
    userName = null;
    userProfilePicUrl = null;
    if (typeof updateUIForLoggedOutUser === 'function') {
        updateUIForLoggedOutUser();
    }

    fetch(`${BACKEND_URL}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        console.log("Backend logout response:", data.message);
        alert("Uspešno ste se odjavili.");
    })
    .catch(error => {
        console.error("Error during backend logout:", error);
        alert("Došlo je do greške prilikom odjave sa servera.");
    });
}

// Funkcije za rad sa glavnim podacima
function saveMainData(dataToSave) {
    return fetch(`${BACKEND_URL}/save-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${googleIdToken}` },
        body: JSON.stringify(dataToSave)
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                if (typeof updateUIForLoggedOutUser === 'function') updateUIForLoggedOutUser(); 
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    });
}

function loadMainData() {
    if (!googleIdToken) { return Promise.reject("Niste prijavljeni."); }

    return fetch(`${BACKEND_URL}/load-data`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${googleIdToken}` }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                if (typeof updateUIForLoggedOutUser === 'function') updateUIForLoggedOutUser(); 
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    });
}

// Funkcije za rad sa potkategorijama
function loadSubcategoriesAPI() {
    if (!googleIdToken) { return Promise.reject("Niste prijavljeni."); }

    return fetch(`${BACKEND_URL}/subcategories`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${googleIdToken}` }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                if (typeof updateUIForLoggedOutUser === 'function') updateUIForLoggedOutUser(); 
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    });
}

function loadSubcategoryDetailsAPI(subcategoryId) {
    if (!googleIdToken) { return Promise.reject("Niste prijavljeni."); }

    return fetch(`${BACKEND_URL}/subcategories/${subcategoryId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${googleIdToken}` }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                if (typeof updateUIForLoggedOutUser === 'function') updateUIForLoggedOutUser(); 
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    });
}

function saveSubcategoryAPI(subcategoryId, subcategoryData) {
    if (!googleIdToken) { return Promise.reject("Niste prijavljeni."); }

    const url = `${BACKEND_URL}/subcategories/${subcategoryId}`;
    return fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${googleIdToken}` },
        body: JSON.stringify(subcategoryData)
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                if (typeof updateUIForLoggedOutUser === 'function') updateUIForLoggedOutUser(); 
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    });
}

// Globalno izlaganje funkcija i varijabli kako bi bile dostupne u index.html
window.googleIdToken = googleIdToken;
window.userName = userName;
window.userProfilePicUrl = userProfilePicUrl;
window.handleCredentialResponse = handleCredentialResponse;
window.signOut = signOut;
window.saveMainData = saveMainData;
window.loadMainData = loadMainData;
window.loadSubcategoriesAPI = loadSubcategoriesAPI;
window.loadSubcategoryDetailsAPI = loadSubcategoryDetailsAPI;
window.saveSubcategoryAPI = saveSubcategoryAPI;
