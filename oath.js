const BACKEND_URL = 'https://botanica.ngrok.app'; // Tvoja ngrok adresa

// Functions called by Google GSI client
function handleCredentialResponse(response) {
    console.log("Encoded JWT ID token: " + response.credential);
    window.googleIdToken = response.credential;

    // Parse JWT token to get user data, including picture
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
            // Update UI via function in index.html
            updateUIForLoggedInUser(window.userName, window.userProfilePicUrl);
            loadSubcategories(); // Load subcategories after successful login
        } else {
            console.error("Backend login failed:", data.message);
            alert("Login failed: " + data.message);
            window.googleIdToken = null;
            window.userName = null;
            window.userProfilePicUrl = null;
            updateUIForLoggedOutUser();
        }
    })
    .catch(error => {
        console.error("Error during backend login verification:", error);
        alert("An error occurred during login. Please try again.");
        window.googleIdToken = null;
        window.userName = null;
        window.userProfilePicUrl = null;
        updateUIForLoggedOutUser();
    });
}

// --- Main Data (Backend Communication) ---
function saveMainData(dataToSave) {
    if (!window.googleIdToken) {
        alert("Niste prijavljeni. Molimo prijavite se putem Google-a.");
        return;
    }

    fetch(`${BACKEND_URL}/save-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.googleIdToken}` },
        body: JSON.stringify(dataToSave)
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); updateUIForLoggedOutUser(); }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => { setMainMessage(data.message); })
    .catch(error => { console.error("Error saving data:", error); setMainMessage("Greška prilikom čuvanja podataka."); });
}

function loadMainData() {
    if (!window.googleIdToken) {
        alert("Niste prijavljeni. Molimo prijavite se putem Google-a.");
        return;
    }

    fetch(`${BACKEND_URL}/load-data`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${window.googleIdToken}` }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); updateUIForLoggedOutUser(); }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        displayMainData(data); // Update UI via function in index.html
        setMainMessage(data.message);
    })
    .catch(error => { console.error("Error loading data:", error); setMainMessage("Greška prilikom učitavanja podataka."); });
}

function signOut() {
    window.googleIdToken = null;
    window.userName = null;
    window.userProfilePicUrl = null;
    updateUIForLoggedOutUser(); // Update UI via function in index.html

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

// --- Subcategories (Backend Communication) ---

function saveSubcategory(subcategoryData) {
    if (!window.googleIdToken) {
        alert("Niste prijavljeni.");
        return;
    }

    const url = `${BACKEND_URL}/subcategories/${subcategoryData.id}`;

    fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${window.googleIdToken}` },
        body: JSON.stringify(subcategoryData)
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); updateUIForLoggedOutUser(); }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        setSubcategoryMessage(data.message);
        loadSubcategories(true); // Reload list and re-select
        document.getElementById('subcategory-details-section').style.display = 'none'; // Hide details after saving
        clearSubcategoryForm(); // Clear form via function in index.html
    })
    .catch(error => { 
        console.error("Error saving subcategory:", error); 
        setSubcategoryMessage("Greška prilikom čuvanja potkategorije."); 
    });
}

function loadSubcategories(reselect = false) {
    if (!window.googleIdToken) {
        alert("Niste prijavljeni.");
        return;
    }

    fetch(`${BACKEND_URL}/subcategories`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${window.googleIdToken}` }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); updateUIForLoggedOutUser(); }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success' && data.subcategories) {
            populateSubcategoryList(data.subcategories, reselect); // Update UI via function in index.html
        } else {
            populateSubcategoryList([]); // Clear list
            setSubcategoryMessage("Nema sačuvanih potkategorija.");
        }
    })
    .catch(error => { 
        console.error("Error loading subcategories:", error); 
        setSubcategoryMessage("Greška prilikom učitavanja potkategorija."); 
    });
}

function loadSubcategoryDetails(subcategoryId) {
    if (!window.googleIdToken) {
        alert("Niste prijavljeni.");
        return;
    }

    fetch(`${BACKEND_URL}/subcategories/${subcategoryId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${window.googleIdToken}` }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); updateUIForLoggedOutUser(); }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success' && data.subcategory) {
            showSubcategoryForm(data.subcategory); // Populate form via function in index.html
            setSubcategoryMessage(`Potkategorija "${data.subcategory.name}" učitana.`);
        } else {
            setSubcategoryMessage("Potkategorija nije pronađena.");
            document.getElementById('subcategory-details-section').style.display = 'none'; // Hide if not found
            clearSubcategoryForm(); // Clear form via function in index.html
            window.currentSubcategoryId = null;
            document.getElementById('current-subcategory-id').textContent = "Nijedna";
        }
    })
    .catch(error => { 
        console.error("Error loading subcategory details:", error); 
        setSubcategoryMessage("Greška prilikom učitavanja detalja potkategorije."); 
    });
}
