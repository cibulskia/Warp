const BACKEND_URL = 'https://botanica.ngrok.app'; // Tvoja ngrok adresa

let googleIdToken = null;
let userName = null;
let userProfilePicUrl = null; 
let currentSubcategoryId = null;

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
            updateUIForLoggedInUser();
            loadSubcategories();
            loadMainData(); 
        } else {
            console.error("Backend login failed:", data.message);
            alert("Login failed: " + data.message);
            googleIdToken = null;
            userName = null;
            userProfilePicUrl = null;
            updateUIForLoggedOutUser();
        }
    })
    .catch(error => {
        console.error("Error during backend login verification:", error);
        alert("An error occurred during login. Please try again.");
        googleIdToken = null;
        userName = null;
        userProfilePicUrl = null;
        updateUIForLoggedOutUser();
    });
}

function updateUIForLoggedInUser() {
    document.getElementById('g_id_onload').style.display = 'none';
    document.querySelector('.g_id_signin').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    document.getElementById('subcategory-sidebar').style.display = 'flex';
    document.getElementById('user-name').textContent = userName;
    document.getElementById('message').textContent = "";
    document.getElementById('subcategory-message').textContent = "";
    
    const profilePicElement = document.getElementById('profile-picture');
    const profilePicPlaceholder = document.getElementById('profile-picture-placeholder');
    if (userProfilePicUrl) {
        profilePicElement.src = userProfilePicUrl;
        profilePicElement.style.display = 'block';
        profilePicPlaceholder.style.display = 'none';
    } else {
        profilePicElement.style.display = 'none';
        profilePicPlaceholder.style.display = 'block';
    }
    
    document.getElementById('input1').value = "";
    document.getElementById('input2').value = "";
    document.getElementById('large-text-input').value = "";
    document.getElementById('input3').value = "";
    document.getElementById('input4').value = "";
    document.getElementById('input5').value = "";
    document.getElementById('dropdown-input').value = "";
    document.getElementById('large-text-input-2').value = ""; 
    document.getElementById('large-text-input-3').value = ""; 

    document.getElementById('subcategory-details-section').style.display = 'none'; 
    currentSubcategoryId = null;
    document.getElementById('current-subcategory-id').textContent = "Nijedna";
    clearSubcategoryForm();
    document.querySelectorAll('.subcategory-list-item').forEach(item => item.classList.remove('selected'));
}

function updateUIForLoggedOutUser() {
    document.getElementById('g_id_onload').style.display = 'block';
    document.querySelector('.g_id_signin').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('subcategory-sidebar').style.display = 'none';
    document.getElementById('user-name').textContent = "";
    document.getElementById('message').textContent = "Molimo prijavite se putem Google-a.";
    document.getElementById('subcategory-message').textContent = "";
    googleIdToken = null;
    userName = null;
    userProfilePicUrl = null; 
    document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.getElementById('subcategory-list').innerHTML = '';

    document.getElementById('profile-picture').style.display = 'none';
    document.getElementById('profile-picture-placeholder').style.display = 'block';
    document.getElementById('profile-picture').src = '';
}

window.onload = function() {
    updateUIForLoggedOutUser();
};

// --- Glavni podaci ---
document.getElementById('save-button').addEventListener('click', () => {
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
        largeText2: document.getElementById('large-text-input-2').value, 
        largeText3: document.getElementById('large-text-input-3').value  
    };

    fetch(`${BACKEND_URL}/save-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${googleIdToken}` },
        body: JSON.stringify(dataToSave)
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); updateUIForLoggedOutUser(); }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => { document.getElementById('message').textContent = data.message; })
    .catch(error => { console.error("Error saving data:", error); document.getElementById('message').textContent = "Greška prilikom čuvanja podataka."; });
});

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
            if (response.status === 401) { alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); updateUIForLoggedOutUser(); }
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
        document.getElementById('large-text-input-2').value = data.largeText2 || ''; 
        document.getElementById('large-text-input-3').value = data.largeText3 || ''; 
        
        document.getElementById('message').textContent = data.message;
    })
    .catch(error => { console.error("Error loading data:", error); document.getElementById('message').textContent = "Greška prilikom učitavanja podataka."; });
}

document.getElementById('signout-button').addEventListener('click', () => {
    googleIdToken = null;
    userName = null;
    userProfilePicUrl = null; 
    updateUIForLoggedOutUser();

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
});

// --- Funkcije za potkategorije ---

function clearSubcategoryForm() {
    document.getElementById('subcategory-name').value = '';
    document.getElementById('subcategory-short-desc').value = '';
    document.getElementById('subcategory-long-desc').value = '';
    document.getElementById('subcategory-checkbox').checked = false;
}

function showSubcategoryForm(subcategory = {}) {
    currentSubcategoryId = subcategory.id;
    document.getElementById('current-subcategory-id').textContent = subcategory.id;
    document.getElementById('subcategory-name').value = subcategory.name || '';
    document.getElementById('subcategory-short-desc').value = subcategory.short_description || '';
    document.getElementById('subcategory-long-desc').value = subcategory.long_description || '';
    document.getElementById('subcategory-checkbox').checked = subcategory.is_active;
}

document.getElementById('cancel-subcategory-edit-button').addEventListener('click', () => {
    document.getElementById('subcategory-details-section').style.display = 'none'; 
    clearSubcategoryForm();
    currentSubcategoryId = null;
    document.getElementById('current-subcategory-id').textContent = "Nijedna";
    document.getElementById('subcategory-message').textContent = "";
    document.querySelectorAll('.subcategory-list-item').forEach(item => item.classList.remove('selected')); 
});

document.getElementById('save-subcategory-button').addEventListener('click', () => {
    if (!googleIdToken) {
        alert("Niste prijavljeni.");
        return;
    }
    if (!currentSubcategoryId) {
        alert("Nije odabrana potkategorija za čuvanje.");
        return;
    }

    const subcategoryData = {
        id: currentSubcategoryId,
        name: document.getElementById('subcategory-name').value, 
        short_description: document.getElementById('subcategory-short-desc').value,
        long_description: document.getElementById('subcategory-long-desc').value,
        is_active: document.getElementById('subcategory-checkbox').checked
    };

    const url = `${BACKEND_URL}/subcategories/${currentSubcategoryId}`;

    fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${googleIdToken}` },
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
        document.getElementById('subcategory-message').textContent = data.message;
        loadSubcategories(true); 
        document.getElementById('subcategory-details-section').style.display = 'none';
        clearSubcategoryForm();
    })
    .catch(error => { 
        console.error("Error saving subcategory:", error); 
        document.getElementById('subcategory-message').textContent = "Greška prilikom čuvanja potkategorije."; 
    });
});

function loadSubcategories(reselect = false) {
    if (!googleIdToken) {
        return;
    }

    fetch(`${BACKEND_URL}/subcategories`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${googleIdToken}` }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); updateUIForLoggedOutUser(); }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        const subcategoryListElement = document.getElementById('subcategory-list');
        subcategoryListElement.innerHTML = '';
        
        let newlySelectedId = currentSubcategoryId; 

        if (data.status === 'success' && data.subcategories.length > 0) {
            data.subcategories.forEach(sub => {
                const listItem = document.createElement('li');
                listItem.className = 'subcategory-list-item';
                listItem.dataset.id = sub.id;
                listItem.textContent = sub.name;
                listItem.addEventListener('click', () => {
                    selectSubcategory(sub.id);
                });
                subcategoryListElement.appendChild(listItem);
            });
            document.getElementById('subcategory-message').textContent = "Potkategorije uspešno učitane.";
        } else {
            document.getElementById('subcategory-message').textContent = "Nema sačuvanih potkategorija.";
        }

        if (reselect && newlySelectedId) {
            selectSubcategory(newlySelectedId); 
        } else {
            currentSubcategoryId = null;
            document.getElementById('current-subcategory-id').textContent = "Nijedna";
            document.getElementById('subcategory-details-section').style.display = 'none'; 
            clearSubcategoryForm();
        }
    })
    .catch(error => { 
        console.error("Error loading subcategories:", error); 
        document.getElementById('subcategory-message').textContent = "Greška prilikom učitavanja potkategorija."; 
    });
}

function selectSubcategory(subcategoryId) {
    document.querySelectorAll('.subcategory-list-item').forEach(item => {
        item.classList.remove('selected');
    });

    const selectedItem = document.querySelector(`.subcategory-list-item[data-id="${subcategoryId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
        loadSubcategoryDetails(subcategoryId);
        document.getElementById('subcategory-details-section').style.display = 'block'; 
    }
}

function loadSubcategoryDetails(subcategoryId) {
    if (!googleIdToken) {
        return;
    }

    fetch(`${BACKEND_URL}/subcategories/${subcategoryId}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${googleIdToken}` }
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
            showSubcategoryForm(data.subcategory); 
            document.getElementById('subcategory-message').textContent = `Potkategorija "${data.subcategory.name}" učitana.`;
        } else {
            document.getElementById('subcategory-message').textContent = "Potkategorija nije pronađena.";
            document.getElementById('subcategory-details-section').style.display = 'none'; 
            clearSubcategoryForm();
            currentSubcategoryId = null;
            document.getElementById('current-subcategory-id').textContent = "Nijedna";
        }
    })
    .catch(error => { 
        console.error("Error loading subcategory details:", error); 
        document.getElementById('subcategory-message').textContent = "Greška prilikom učitavanja detalja potkategorije."; 
    });
}
