const BACKEND_URL = 'https://botanica.ngrok.app'; // Tvoja ngrok adresa

// Globalne varijable koje će biti dostupne i u index.html kroz window objekat
window.googleIdToken = null;
window.userName = null;
window.userProfilePicUrl = null;

// Funkcija za rukovanje Google credential odgovorom
window.handleCredentialResponse = async function(response) {
    console.log("Encoded JWT ID token: " + response.credential);
    window.googleIdToken = response.credential;

    const tokenParts = window.googleIdToken.split('.');
    const payload = JSON.parse(atob(tokenParts[1]));
    window.userName = payload.name;
    window.userProfilePicUrl = payload.picture;

    try {
        const fetchResponse = await fetch(`${BACKEND_URL}/verify-google-login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_token: window.googleIdToken })
        });

        if (!fetchResponse.ok) {
            const errorData = await fetchResponse.json();
            throw new Error(`HTTP error! status: ${fetchResponse.status}, message: ${errorData.message}`);
        }

        const data = await fetchResponse.json();
        if (data.status === 'success') {
            console.log("Login successful on backend:", data);
            if (window.onLoginSuccess) window.onLoginSuccess(); // Pozivamo funkciju iz index.html
        } else {
            console.error("Backend login failed:", data.message);
            if (window.onLoginFailure) window.onLoginFailure(data.message);
        }
    } catch (error) {
        console.error("Error during backend login verification:", error);
        if (window.onLoginFailure) window.onLoginFailure("An error occurred during login. Please try again.");
    }
};

// Funkcija za čuvanje glavnih podataka
window.saveMainData = async function(dataToSave) {
    if (!window.googleIdToken) {
        return { status: 'error', message: "Niste prijavljeni." };
    }

    try {
        const response = await fetch(`${BACKEND_URL}/save-data`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.googleIdToken}` },
            body: JSON.stringify(dataToSave)
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo.");
                if (window.updateUIForLoggedOutUser) window.updateUIForLoggedOutUser();
            }
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error saving main data:", error);
        return { status: 'error', message: "Greška prilikom čuvanja glavnih podataka." };
    }
};

// Funkcija za učitavanje glavnih podataka
window.loadMainData = async function() {
    if (!window.googleIdToken) {
        return null; // Vrati null ako korisnik nije prijavljen
    }

    try {
        const response = await fetch(`${BACKEND_URL}/load-data`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${window.googleIdToken}` }
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo.");
                if (window.updateUIForLoggedOutUser) window.updateUIForLoggedOutUser();
            }
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error loading main data:", error);
        return { status: 'error', message: "Greška prilikom učitavanja glavnih podataka." };
    }
};

// Funkcija za odjavu
window.signOut = async function() {
    try {
        const response = await fetch(`${BACKEND_URL}/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await response.json();
        console.log("Backend logout response:", data.message);
    } catch (error) {
        console.error("Error during backend logout:", error);
        alert("Došlo je do greške prilikom odjave sa servera.");
    }
    window.googleIdToken = null;
    window.userName = null;
    window.userProfilePicUrl = null;
};

// Funkcija za učitavanje potkategorija
window.loadSubcategories = async function() {
    if (!window.googleIdToken) {
        return null;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/subcategories`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${window.googleIdToken}` }
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo.");
                if (window.updateUIForLoggedOutUser) window.updateUIForLoggedOutUser();
            }
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error loading subcategories:", error);
        return { status: 'error', message: "Greška prilikom učitavanja potkategorija." };
    }
};

// Funkcija za učitavanje detalja potkategorije
window.loadSubcategoryDetails = async function(subcategoryId) {
    if (!window.googleIdToken) {
        return null;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/subcategories/${subcategoryId}`, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${window.googleIdToken}` }
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo.");
                if (window.updateUIForLoggedOutUser) window.updateUIForLoggedOutUser();
            }
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error loading subcategory details:", error);
        return { status: 'error', message: "Greška prilikom učitavanja detalja potkategorije." };
    }
};

// Funkcija za čuvanje (ažuriranje) potkategorije
window.saveSubcategory = async function(subcategoryId, subcategoryData) {
    if (!window.googleIdToken) {
        return { status: 'error', message: "Niste prijavljeni." };
    }

    try {
        const url = `${BACKEND_URL}/subcategories/${subcategoryId}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.googleIdToken}` },
            body: JSON.stringify(subcategoryData)
        });

        if (!response.ok) {
            if (response.status === 401) {
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo.");
                if (window.updateUIForLoggedOutUser) window.updateUIForLoggedOutUser();
            }
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Error saving subcategory:", error);
        return { status: 'error', message: "Greška prilikom čuvanja potkategorije." };
    }
};
