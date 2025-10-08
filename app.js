// app.js

const BACKEND_URL = 'https://botanica.ngrok.app';

let googleIdToken = null;
let userName = null;
let userProfilePicUrl = null;
let currentSubcategoryId = null; // This will also be managed by UI, but its value is critical for backend calls

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
            // Call UI update functions from main script
            window.updateUIForLoggedInUser(userName, userProfilePicUrl);
            window.loadSubcategories(); // Call the function from the main script
            window.loadMainData();      // Call the function from the main script
        } else {
            console.error("Backend login failed:", data.message);
            alert("Login failed: " + data.message);
            googleIdToken = null;
            userName = null;
            userProfilePicUrl = null;
            window.updateUIForLoggedOutUser(); // Call the function from the main script
        }
    })
    .catch(error => {
        console.error("Error during backend login verification:", error);
        alert("An error occurred during login. Please try again.");
        googleIdToken = null;
        userName = null;
        userProfilePicUrl = null;
        window.updateUIForLoggedOutUser(); // Call the function from the main script
    });
}

function saveMainData() {
    if (!googleIdToken) {
        alert("Niste prijavljeni. Molimo prijavite se putem Google-a.");
        return;
    }

    const dataToSave = {
        input1: document.getElementById('input1').value,
        input2: document.getElementById('input2').value,
        largeText: document.getElementById('large-text-input').value,
        input3: document.getElementById('input3').value,
        input4: document.getElementById('input4').value,
        input5: document.getElementById('input5').value,
        dropdown: document.getElementById('dropdown-input').value,
        largeText2: document.getElementById('sidebar-large-text-input-2').value,
        largeText3: document.getElementById('sidebar-large-text-input-3').value
    };

    fetch(`${BACKEND_URL}/save-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${googleIdToken}` },
        body: JSON.stringify(dataToSave)
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); window.updateUIForLoggedOutUser(); }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => { document.getElementById('message').textContent = data.message; })
    .catch(error => { console.error("Error saving data:", error); document.getElementById('message').textContent = "Greška prilikom čuvanja podataka."; });
}

function loadMainData() {
    if (!googleIdToken) {
        return;
    }

    fetch(`${BACKEND_URL}/load-data`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${googleIdToken}` }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); window.updateUIForLoggedOutUser(); }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        document.getElementById('input1').value = data.input1 || '';
        document.getElementById('input2').value = data.input2 || '';
        document.getElementById('large-text-input').value = data.largeText || '';
        document.getElementById('input3').value = data.input3 || '';
        document.getElementById('input4').value = data.input4 || '';
        document.getElementById('input5').value = data.input5 || '';
        document.getElementById('dropdown-input').value = data.dropdown || '';
        document.getElementById('sidebar-large-text-input-2').value = data.largeText2 || '';
        document.getElementById('sidebar-large-text-input-3').value = data.largeText3 || '';
        
        document.getElementById('message').textContent = data.message;
    })
    .catch(error => { console.error("Error loading data:", error); document.getElementById('message').textContent = "Greška prilikom učitavanja podataka."; });
}

function signOutUser() {
    googleIdToken = null;
    userName = null;
    userProfilePicUrl = null;
    window.updateUIForLoggedOutUser(); // Call the function from the main script

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

function saveSubcategory(subcategoryData, isNew, subcategoryIdToUpdate = null) {
    if (!googleIdToken) {
        alert("Niste prijavljeni.");
        return;
    }

    let url = `${BACKEND_URL}/subcategories`;
    let method = 'POST';

    if (!isNew && subcategoryIdToUpdate) {
        url = `${BACKEND_URL}/subcategories/${subcategoryIdToUpdate}`;
        method = 'PUT';
    }

    fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${googleIdToken}` },
        body: JSON.stringify(subcategoryData)
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); window.updateUIForLoggedOutUser(); }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        document.getElementById('subcategory-message').textContent = data.message;
        if (data.status === 'success' && data.subcategory && method === 'POST') {
            currentSubcategoryId = data.subcategory.id; // Update global ID for newly created
        }
        window.loadSubcategories(true); // Reload and re-select if needed
    })
    .catch(error => { 
        console.error("Error saving subcategory:", error); 
        document.getElementById('subcategory-message').textContent = "Greška prilikom čuvanja potkategorije."; 
    });
}

function deleteSubcategory(subcategoryId) {
    if (!googleIdToken) {
        alert("Niste prijavljeni.");
        return;
    }
    if (!subcategoryId || subcategoryId === 'Nova') {
        alert("Nije odabrana potkategorija za brisanje.");
        return;
    }

    if (!confirm(`Da li ste sigurni da želite da obrišete potkategoriju ${subcategoryId}?`)) {
        return;
    }

    fetch(`${BACKEND_URL}/subcategories/${subcategoryId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${googleIdToken}` }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); window.updateUIForLoggedOutUser(); }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        document.getElementById('subcategory-message').textContent = data.message;
        document.getElementById('subcategory-form').style.display = 'none';
        window.clearSubcategoryForm();
        currentSubcategoryId = null;
        document.getElementById('current-subcategory-id').textContent = "Nijedna";
        window.loadSubcategories();
    })
    .catch(error => { 
        console.error("Error deleting subcategory:", error); 
        document.getElementById('subcategory-message').textContent = "Greška prilikom brisanja potkategorije."; 
    });
}

function loadSubcategoriesFromBackend(reselect = false) {
    if (!googleIdToken) {
        alert("Niste prijavljeni.");
        return;
    }

    fetch(`${BACKEND_URL}/subcategories`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${googleIdToken}` }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); window.updateUIForLoggedOutUser(); }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        const subcategoryListElement = document.getElementById('subcategory-list');
        subcategoryListElement.innerHTML = '';
        
        let newlySelectedId = currentSubcategoryId; // Keep track of potentially selected ID

        if (data.status === 'success' && data.subcategories.length > 0) {
            data.subcategories.forEach(sub => {
                const listItem = document.createElement('li');
                listItem.className = 'subcategory-list-item';
                listItem.dataset.id = sub.id;
                listItem.textContent = sub.name;
                listItem.addEventListener('click', () => {
                    window.selectSubcategory(sub.id);
                });
                subcategoryListElement.appendChild(listItem);
            });
            document.getElementById('subcategory-message').textContent = "Lista Poslova Uspešno Učitana.";
        } else {
            document.getElementById('subcategory-message').textContent = "Nema sačuvanih potkategorija.";
        }

        if (reselect && newlySelectedId && newlySelectedId !== 'Nova') {
            window.selectSubcategory(newlySelectedId);
        } else {
            currentSubcategoryId = null; // Clear if no reselect or new category
            document.getElementById('current-subcategory-id').textContent = "Nijedna";
            document.getElementById('subcategory-form').style.display = 'none';
            window.clearSubcategoryForm();
        }
    })
    .catch(error => { 
        console.error("Error loading subcategories:", error); 
        document.getElementById('subcategory-message').textContent = "Greška prilikom učitavanja potkategorija."; 
    });
}

function loadSubcategoryDetailsFromBackend(subcategoryId) {
    if (!googleIdToken) {
        alert("Niste prijavljeni.");
        return;
    }

    fetch(`${BACKEND_URL}/subcategories/${subcategoryId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${googleIdToken}` }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); window.updateUIForLoggedOutUser(); }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success' && data.subcategory) {
            currentSubcategoryId = data.subcategory.id; // Update global ID
            window.showSubcategoryForm(data.subcategory);
            document.getElementById('subcategory-message').textContent = `Potkategorija "${data.subcategory.name}" učitana.`;
        } else {
            document.getElementById('subcategory-message').textContent = "Potkategorija nije pronađena.";
            document.getElementById('subcategory-form').style.display = 'none';
            window.clearSubcategoryForm();
            currentSubcategoryId = null;
            document.getElementById('current-subcategory-id').textContent = "Nijedna";
        }
    })
    .catch(error => { 
        console.error("Error loading subcategory details:", error); 
        document.getElementById('subcategory-message').textContent = "Greška prilikom učitavanja detalja potkategorije."; 
    });
}

// Expose functions globally for index.html to call
window.handleCredentialResponse = handleCredentialResponse;
window.saveMainData = saveMainData;
window.loadMainData = loadMainData;
window.signOutUser = signOutUser;
window.saveSubcategory = saveSubcategory;
window.deleteSubcategory = deleteSubcategory;
window.loadSubcategoriesFromBackend = loadSubcategoriesFromBackend;
window.loadSubcategoryDetailsFromBackend = loadSubcategoryDetailsFromBackend;

// Helper to get currentSubcategoryId in UI functions
window.getCurrentSubcategoryId = () => currentSubcategoryId;
window.setCurrentSubcategoryId = (id) => { currentSubcategoryId = id; };
