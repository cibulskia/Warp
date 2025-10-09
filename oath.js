// oauth.js
const BACKEND_URL = 'https://botanica.ngrok.app'; // Tvoja ngrok adresa

let googleIdToken = null;
let userName = null;
let userProfilePicUrl = null;

// Ova funkcija se poziva globalno od strane Google GSI biblioteke
// Kada Google One Tap završi, pozvaće ovu funkciju
window.handleCredentialResponse = async (response) => {
    console.log("Encoded JWT ID token: " + response.credential);
    googleIdToken = response.credential;

    const tokenParts = googleIdToken.split('.');
    const payload = JSON.parse(atob(tokenParts[1]));
    userName = payload.name;
    userProfilePicUrl = payload.picture;

    try {
        const backendResponse = await fetch(`${BACKEND_URL}/verify-google-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_token: googleIdToken })
        });

        if (!backendResponse.ok) {
            const errorData = await backendResponse.json();
            throw new Error(`HTTP error! status: ${backendResponse.status}, message: ${errorData.message}`);
        }
        const data = await backendResponse.json();

        if (data.status === 'success') {
            console.log("Login successful on backend:", data);
            // Umesto direktnog pozivanja UI funkcija, emitujemo događaj
            const event = new CustomEvent('google-login-success', { 
                detail: { 
                    googleIdToken: googleIdToken, 
                    userName: userName, 
                    userProfilePicUrl: userProfilePicUrl 
                } 
            });
            window.dispatchEvent(event);
        } else {
            console.error("Backend login failed:", data.message);
            alert("Login failed: " + data.message);
            googleIdToken = null;
            userName = null;
            userProfilePicUrl = null;
            window.dispatchEvent(new CustomEvent('google-logout-success')); // Emituj logout događaj
        }
    } catch (error) {
        console.error("Error during backend login verification:", error);
        alert("An error occurred during login. Please try again.");
        googleIdToken = null;
        userName = null;
        userProfilePicUrl = null;
        window.dispatchEvent(new CustomEvent('google-logout-success')); // Emituj logout događaj
    }
};

window.signOut = async () => {
    try {
        const response = await fetch(`${BACKEND_URL}/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        console.log("Backend logout response:", data.message);
        alert("Uspešno ste se odjavili.");
    } catch (error) {
        console.error("Error during backend logout:", error);
        alert("Došlo je do greške prilikom odjave sa servera.");
    } finally {
        googleIdToken = null;
        userName = null;
        userProfilePicUrl = null;
        // Emituj događaj odjave
        window.dispatchEvent(new CustomEvent('google-logout-success'));
    }
};

// Funkcije za rad sa glavnim podacima
window.saveMainData = async (dataToSave) => {
    if (!googleIdToken) { throw new Error("Niste prijavljeni."); }

    try {
        const response = await fetch(`${BACKEND_URL}/save-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${googleIdToken}` },
            body: JSON.stringify(dataToSave)
        });

        if (!response.ok) {
            if (response.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                window.dispatchEvent(new CustomEvent('google-logout-success'));
            }
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error in saveMainData:", error);
        throw error;
    }
};

window.loadMainData = async () => {
    if (!googleIdToken) { throw new Error("Niste prijavljeni."); }

    try {
        const response = await fetch(`${BACKEND_URL}/load-data`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${googleIdToken}` }
        });

        if (!response.ok) {
            if (response.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                window.dispatchEvent(new CustomEvent('google-logout-success'));
            }
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error in loadMainData:", error);
        throw error;
    }
};

// Funkcije za rad sa potkategorijama
window.loadSubcategoriesAPI = async () => {
    if (!googleIdToken) { throw new Error("Niste prijavljeni."); }

    try {
        const response = await fetch(`${BACKEND_URL}/subcategories`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${googleIdToken}` }
        });

        if (!response.ok) {
            if (response.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                window.dispatchEvent(new CustomEvent('google-logout-success'));
            }
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error in loadSubcategoriesAPI:", error);
        throw error;
    }
};

window.loadSubcategoryDetailsAPI = async (subcategoryId) => {
    if (!googleIdToken) { throw new Error("Niste prijavljeni."); }

    try {
        const response = await fetch(`${BACKEND_URL}/subcategories/${subcategoryId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${googleIdToken}` }
        });

        if (!response.ok) {
            if (response.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                window.dispatchEvent(new CustomEvent('google-logout-success'));
            }
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error in loadSubcategoryDetailsAPI:", error);
        throw error;
    }
};

window.saveSubcategoryAPI = async (subcategoryId, subcategoryData) => {
    if (!googleIdToken) { throw new Error("Niste prijavljeni."); }

    try {
        const url = `${BACKEND_URL}/subcategories/${subcategoryId}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${googleIdToken}` },
            body: JSON.stringify(subcategoryData)
        });

        if (!response.ok) {
            if (response.status === 401) { 
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); 
                window.dispatchEvent(new CustomEvent('google-logout-success'));
            }
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error in saveSubcategoryAPI:", error);
        throw error;
    }
};

// Globalne varijable koje će index.html koristiti za dobijanje stanja logina
window.getGoogleIdToken = () => googleIdToken;
window.getUserName = () => userName;
window.getUserProfilePicUrl = () => userProfilePicUrl;
