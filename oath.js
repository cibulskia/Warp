// oauth.js
const BACKEND_URL = 'https://botanica.ngrok.app'; // Tvoja ngrok adresa

// Ove varijable su globalne unutar oauth.js i izložene su preko window.
window.googleIdToken = null;
window.userName = null;
window.userProfilePicUrl = null;

// Funkcija za dobijanje trenutnih detalja autentifikacije
window.getAuthDetails = function() {
    return {
        idToken: window.googleIdToken,
        name: window.userName,
        profilePicUrl: window.userProfilePicUrl
    };
};

// Funkcija koju poziva Google GSI nakon prijave
window.handleCredentialResponse = function(response) {
    console.log("Encoded JWT ID token: " + response.credential);
    window.googleIdToken = response.credential;

    const tokenParts = window.googleIdToken.split('.');
    const payload = JSON.parse(atob(tokenParts[1]));
    window.userName = payload.name;
    window.userProfilePicUrl = payload.picture;

    fetch(`${BACKEND_URL}/verify-google-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: window.googleIdToken })
    })
    .then(response => {
        if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            console.log("Login successful on backend:", data);
            // Provera da li je globalna funkcija dostupna pre poziva
            if (typeof window.onLoginSuccess === 'function') {
                window.onLoginSuccess();
            }
        } else {
            console.error("Backend login failed:", data.message);
            alert("Login failed: " + data.message);
            window.googleIdToken = null;
            window.userName = null;
            window.userProfilePicUrl = null;
            if (typeof window.onLoginFailure === 'function') {
                window.onLoginFailure();
            }
        }
    })
    .catch(error => {
        console.error("Error during backend login verification:", error);
        alert("An error occurred during login. Please try again.");
        window.googleIdToken = null;
        window.userName = null;
        window.userProfilePicUrl = null;
        if (typeof window.onLoginFailure === 'function') {
            window.onLoginFailure();
        }
    });
};

// Funkcija za odjavu
window.signOut = function() {
    window.googleIdToken = null;
    window.userName = null;
    window.userProfilePicUrl = null;
    if (typeof window.onLogout === 'function') {
        window.onLogout();
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
};

// Funkcije za rad sa glavnim podacima
window.  saveMainDataAPI = function(dataToSave) {
    if (!window.googleIdToken) { return Promise.reject("Niste prijavljeni."); }

    return fetch(`${BACKEND_URL}/save-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.googleIdToken}` },
        body: JSON.stringify(dataToSave)
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                if (typeof window.onSessionExpired === 'function') window.onSessionExpired(); 
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    });
};

window.loadMainDataAPI = function() {
    if (!window.googleIdToken) { return Promise.reject("Niste prijavljeni."); }

    return fetch(`${BACKEND_URL}/load-data`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${window.googleIdToken}` }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                if (typeof window.onSessionExpired === 'function') window.onSessionExpired(); 
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    });
};

// Funkcije za rad sa potkategorijama
window.loadSubcategoriesAPI = function() {
    if (!window.googleIdToken) { return Promise.reject("Niste prijavljeni."); }

    return fetch(`${BACKEND_URL}/subcategories`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${window.googleIdToken}` }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                if (typeof window.onSessionExpired === 'function') window.onSessionExpired(); 
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    });
};

window.loadSubcategoryDetailsAPI = function(subcategoryId) {
    if (!window.googleIdToken) { return Promise.reject("Niste prijavljeni."); }

    return fetch(`${BACKEND_URL}/subcategories/${subcategoryId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${window.googleIdToken}` }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                if (typeof window.onSessionExpired === 'function') window.onSessionExpired(); 
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    });
};

window.saveSubcategoryAPI = function(subcategoryId, subcategoryData) {
    if (!window.googleIdToken) { return Promise.reject("Niste prijavljeni."); }

    const url = `${BACKEND_URL}/subcategories/${subcategoryId}`;
    return fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.googleIdToken}` },
        body: JSON.stringify(subcategoryData)
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                if (typeof window.onSessionExpired === 'function') window.onSessionExpired(); 
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    });
};
