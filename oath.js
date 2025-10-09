const BACKEND_URL = 'https://botanica.ngrok.app'; // Tvoja ngrok adresa

let googleIdToken = null; // Globalna promenljiva za id token
let userName = null;
let userProfilePicUrl = null;

// Funkcija koju poziva Google GSI biblioteka nakon prijave
async function handleCredentialResponse(response) {
    console.log("Encoded JWT ID token: " + response.credential);
    googleIdToken = response.credential;

    // Parsiranje JWT tokena za dobijanje podataka o korisniku, uključujući sliku
    const tokenParts = googleIdToken.split('.');
    const payload = JSON.parse(atob(tokenParts[1]));
    userName = payload.name;
    userProfilePicUrl = payload.picture;

    try {
        const res = await fetch(`${BACKEND_URL}/verify-google-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_token: googleIdToken })
        });

        if (!res.ok) { throw new Error(`HTTP error! status: ${res.status}`); }
        const data = await res.json();

        if (data.status === 'success') {
            console.log("Login successful on backend:", data);
            updateUIForLoggedInUser(userName, userProfilePicUrl); // Ažurira UI
            loadSubcategoriesAndUpdateUI(); // Automatsko učitavanje potkategorija
            loadMainDataAndUpdateUI(); // Automatsko učitavanje glavnih podataka
        } else {
            console.error("Backend login failed:", data.message);
            alert("Login failed: " + data.message);
            googleIdToken = null;
            userName = null;
            userProfilePicUrl = null;
            updateUIForLoggedOutUser(); // Ažurira UI na odjavljeno stanje
        }
    } catch (error) {
        console.error("Error during backend login verification:", error);
        alert("An error occurred during login. Please try again.");
        googleIdToken = null;
        userName = null;
        userProfilePicUrl = null;
        updateUIForLoggedOutUser(); // Ažurira UI na odjavljeno stanje
    }
}

// Funkcija za čuvanje glavnih podataka
async function saveMainData(dataToSave) {
    if (!googleIdToken) {
        alert("Niste prijavljeni. Molimo prijavite se putem Google-a.");
        return { success: false, message: "Niste prijavljeni.", isSessionExpired: false };
    }

    try {
        const res = await fetch(`${BACKEND_URL}/save-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${googleIdToken}` },
            body: JSON.stringify(dataToSave)
        });

        if (!res.ok) {
            if (res.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                return { success: false, message: "Sesija istekla.", isSessionExpired: true };
            }
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        return { success: true, message: data.message, isSessionExpired: false };
    } catch (error) {
        console.error("Error saving data:", error);
        return { success: false, message: "Greška prilikom čuvanja podataka.", isSessionExpired: false };
    }
}

// Funkcija za učitavanje glavnih podataka
async function loadMainData() {
    if (!googleIdToken) {
        return { success: false, message: "Niste prijavljeni.", isSessionExpired: false };
    }

    try {
        const res = await fetch(`${BACKEND_URL}/load-data`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${googleIdToken}` }
        });

        if (!res.ok) {
            if (res.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                return { success: false, message: "Sesija istekla.", isSessionExpired: true };
            }
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        return { success: true, message: data.message, data: data, isSessionExpired: false };
    } catch (error) {
        console.error("Error loading data:", error);
        return { success: false, message: "Greška prilikom učitavanja podataka.", isSessionExpired: false };
    }
}

// Funkcija za odjavu
async function signOutUser() {
    try {
        const res = await fetch(`${BACKEND_URL}/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        console.log("Backend logout response:", data.message);
        googleIdToken = null;
        userName = null;
        userProfilePicUrl = null;
        return { success: true, message: data.message };
    } catch (error) {
        console.error("Error during backend logout:", error);
        return { success: false, message: "Greška prilikom odjave sa servera." };
    }
}

// Funkcija za učitavanje potkategorija
async function loadSubcategories() {
    if (!googleIdToken) {
        return { success: false, message: "Niste prijavljeni.", subcategories: [], isSessionExpired: false };
    }

    try {
        const res = await fetch(`${BACKEND_URL}/subcategories`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${googleIdToken}` }
        });

        if (!res.ok) {
            if (res.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                return { success: false, message: "Sesija istekla.", subcategories: [], isSessionExpired: true };
            }
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (data.status === 'success') {
            return { success: true, message: "Potkategorije uspešno učitane.", subcategories: data.subcategories, isSessionExpired: false };
        } else {
            return { success: false, message: data.message || "Nema sačuvanih potkategorija.", subcategories: [], isSessionExpired: false };
        }
    } catch (error) {
        console.error("Error loading subcategories:", error);
        return { success: false, message: "Greška prilikom učitavanja potkategorija.", subcategories: [], isSessionExpired: false };
    }
}

// Funkcija za učitavanje detalja potkategorije
async function loadSubcategoryDetails(subcategoryId) {
    if (!googleIdToken) {
        return { success: false, message: "Niste prijavljeni.", subcategory: null, isSessionExpired: false };
    }

    try {
        const res = await fetch(`${BACKEND_URL}/subcategories/${subcategoryId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${googleIdToken}` }
        });

        if (!res.ok) {
            if (res.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                return { success: false, message: "Sesija istekla.", subcategory: null, isSessionExpired: true };
            }
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        if (data.status === 'success' && data.subcategory) {
            return { success: true, message: `Potkategorija "${data.subcategory.name}" učitana.`, subcategory: data.subcategory, isSessionExpired: false };
        } else {
            return { success: false, message: "Potkategorija nije pronađena.", subcategory: null, isSessionExpired: false };
        }
    } catch (error) {
        console.error("Error loading subcategory details:", error);
        return { success: false, message: "Greška prilikom učitavanja detalja potkategorije.", subcategory: null, isSessionExpired: false };
    }
}

// Funkcija za čuvanje (ažuriranje) potkategorije
async function saveSubcategory(subcategoryData) {
    if (!googleIdToken) {
        alert("Niste prijavljeni.");
        return { success: false, message: "Niste prijavljeni.", isSessionExpired: false };
    }
    if (!subcategoryData.id) {
        return { success: false, message: "ID potkategorije nedostaje.", isSessionExpired: false };
    }

    try {
        const url = `${BACKEND_URL}/subcategories/${subcategoryData.id}`;
        const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${googleIdToken}` },
            body: JSON.stringify(subcategoryData)
        });

        if (!res.ok) {
            if (res.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                return { success: false, message: "Sesija istekla.", isSessionExpired: true };
            }
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        return { success: true, message: data.message, isSessionExpired: false };
    } catch (error) {
        console.error("Error saving subcategory:", error);
        return { success: false, message: "Greška prilikom čuvanja potkategorije.", isSessionExpired: false };
    }
}

// Ove funkcije su globalne jer ih index.html koristi
// Važno: handleCredentialResponse mora biti globalna jer je Google GSI poziva
window.handleCredentialResponse = handleCredentialResponse;
window.saveMainData = saveMainData;
window.loadMainData = loadMainData;
window.signOutUser = signOutUser;
window.loadSubcategories = loadSubcategories;
window.loadSubcategoryDetails = loadSubcategoryDetails;
window.saveSubcategory = saveSubcategory;
