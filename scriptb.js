const BACKEND_URL = 'https://botanica.ngrok.app'; // Tvoja ngrok adresa

let googleIdToken = null;
let userName = null;
let userProfilePic = null; // New variable for profile picture
let currentJobId = null;

// Helper functions for showing/hiding loading spinners and messages
function showLoading(elementId) {
    document.getElementById(elementId).style.display = 'block';
}

function hideLoading(elementId) {
    document.getElementById(elementId).style.display = 'none';
}

function showMessage(elementId, message, type = 'info') {
    const messageElement = document.getElementById(elementId);
    messageElement.textContent = message;
    // Clear previous classes and add the new one
    messageElement.className = `info-message ${type}`; 
    messageElement.style.display = 'block';
}

function hideMessage(elementId) {
    const messageElement = document.getElementById(elementId);
    messageElement.style.display = 'none';
    messageElement.textContent = '';
    messageElement.className = 'info-message'; // Reset to default info style
}

function handleCredentialResponse(response) {
    console.log("Encoded JWT ID token: " + response.credential);
    googleIdToken = response.credential;

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
            userName = data.user_name;
            userProfilePic = data.user_picture; // Get profile picture URL
            updateUIForLoggedInUser();
            loadJobs();
        } else {
            console.error("Backend login failed:", data.message);
            alert("Prijava neuspešna: " + data.message);
            googleIdToken = null;
            userName = null;
            userProfilePic = null;
            updateUIForLoggedOutUser();
        }
    })
    .catch(error => {
        console.error("Greška tokom verifikacije prijave na backendu:", error);
        alert("Došlo je do greške tokom prijave. Molimo pokušajte ponovo.");
        googleIdToken = null;
        userName = null;
        userProfilePic = null;
        updateUIForLoggedOutUser();
    });
}

function updateUIForLoggedInUser() {
    document.getElementById('welcome-message').style.display = 'none';
    document.getElementById('g_id_onload').style.display = 'none';
    document.querySelector('.g_id_signin').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    document.getElementById('job-sidebar').style.display = 'flex';
    document.getElementById('user-name').textContent = userName;
    document.getElementById('signout-button').style.display = 'flex'; // Show signout button

    const profilePicElement = document.getElementById('user-profile-pic');
    if (userProfilePic) {
        profilePicElement.src = userProfilePic;
        profilePicElement.style.display = 'block';
    } else {
        profilePicElement.style.display = 'none';
    }

    hideMessage('message');
    hideMessage('job-message');
    
    // Clear all fields on login (user settings)
    document.getElementById('company-name-input').value = "";
    document.getElementById('company-short-desc-input').value = "";
    document.getElementById('company-long-desc-input').value = "";
    document.getElementById('contact-email-input').value = "";
    document.getElementById('website-input').value = "";
    document.getElementById('additional-info-input').value = "";
    document.getElementById('user-settings-dropdown').value = "";

    // Hide job form
    document.getElementById('job-form').style.display = 'none';
    currentJobId = null;
    document.getElementById('current-job-id').textContent = "Nijedan";
    clearJobForm();
    // Clear selection in sidebar
    document.querySelectorAll('.job-list-item').forEach(item => item.classList.remove('selected'));
}

function updateUIForLoggedOutUser() {
    document.getElementById('welcome-message').style.display = 'flex'; // Show welcome card
    document.getElementById('g_id_onload').style.display = 'block';
    document.querySelector('.g_id_signin').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('job-sidebar').style.display = 'none';
    document.getElementById('user-name').textContent = "";
    document.getElementById('signout-button').style.display = 'none'; // Hide signout button
    document.getElementById('user-profile-pic').style.display = 'none'; // Hide profile picture

    showMessage('message', "Molimo prijavite se putem Google-a.", 'info');
    hideMessage('job-message');
    
    googleIdToken = null;
    userName = null;
    userProfilePic = null;
    document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.getElementById('job-list').innerHTML = '';
}

window.onload = function() {
    updateUIForLoggedOutUser();
};

// --- User settings functions (renamed from "Glavni podaci") ---
document.getElementById('save-settings-button').addEventListener('click', () => {
    if (!googleIdToken) {
        alert("Niste prijavljeni. Molimo prijavite se putem Google-a.");
        return;
    }

    showLoading('settings-loading');
    hideMessage('message');

    const settingsToSave = {
        input1: document.getElementById('company-name-input').value, // Ime firme
        input2: document.getElementById('company-short-desc-input').value, // Kratko objašnjenje firme
        largeText: document.getElementById('company-long-desc-input').value, // Detaljno objašnjenje firme
        input3: document.getElementById('contact-email-input').value, // Kontakt email
        input4: document.getElementById('website-input').value, // Web adresa
        input5: document.getElementById('additional-info-input').value, // Dodatno objašnjenje
        dropdown: document.getElementById('user-settings-dropdown').value
    };

    fetch(`${BACKEND_URL}/save-data`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${googleIdToken}` },
        body: JSON.stringify(settingsToSave)
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); updateUIForLoggedOutUser(); }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => { 
        showMessage('message', data.message, 'success'); 
    })
    .catch(error => { 
        console.error("Greška pri čuvanju postavki:", error); 
        showMessage('message', "Greška prilikom čuvanja korisničkih postavki.", 'error'); 
    })
    .finally(() => {
        hideLoading('settings-loading');
    });
});

document.getElementById('load-settings-button').addEventListener('click', () => {
    if (!googleIdToken) {
        alert("Niste prijavljeni. Molimo prijavite se putem Google-a.");
        return;
    }

    showLoading('settings-loading');
    hideMessage('message');

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
        document.getElementById('company-name-input').value = data.input1 || '';
        document.getElementById('company-short-desc-input').value = data.input2 || '';
        document.getElementById('company-long-desc-input').value = data.largeText || '';
        document.getElementById('contact-email-input').value = data.input3 || '';
        document.getElementById('website-input').value = data.input4 || '';
        document.getElementById('additional-info-input').value = data.input5 || '';
        document.getElementById('user-settings-dropdown').value = data.dropdown || '';
        
        showMessage('message', data.message, 'success');
    })
    .catch(error => { 
        console.error("Greška pri učitavanju postavki:", error); 
        showMessage('message', "Greška prilikom učitavanja korisničkih postavki.", 'error'); 
    })
    .finally(() => {
        hideLoading('settings-loading');
    });
});

document.getElementById('signout-button').addEventListener('click', () => {
    googleIdToken = null;
    userName = null;
    userProfilePic = null;
    updateUIForLoggedOutUser();

    fetch(`${BACKEND_URL}/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => response.json())
    .then(data => {
        console.log("Odgovor na odjavu sa backenda:", data.message);
        showMessage('message', "Uspešno ste se odjavili.", 'info');
    })
    .catch(error => {
        console.error("Greška tokom odjave sa backenda:", error);
        showMessage('message', "Došlo je do greške prilikom odjave sa servera.", 'error');
    });
});

// --- Functions for jobs (renamed from "potkategorija") ---

function clearJobForm() {
    document.getElementById('job-title').value = '';
    document.getElementById('job-short-desc').value = '';
    document.getElementById('job-long-desc').value = '';
    document.getElementById('job-checkbox').checked = false;
}

function showJobForm(job = {}) { 
    document.getElementById('job-form').style.display = 'block';
    currentJobId = job.id;
    document.getElementById('current-job-id').textContent = job.id;
    document.getElementById('job-title').value = job.name || '';
    document.getElementById('job-short-desc').value = job.short_description || '';
    document.getElementById('job-long-desc').value = job.long_description || '';
    document.getElementById('job-checkbox').checked = job.is_active;
}

document.getElementById('cancel-job-edit-button').addEventListener('click', () => {
    document.getElementById('job-form').style.display = 'none';
    clearJobForm();
    currentJobId = null;
    document.getElementById('current-job-id').textContent = "Nijedan"; 
    hideMessage('job-message');
});

document.getElementById('save-job-button').addEventListener('click', () => {
    if (!googleIdToken) {
        alert("Niste prijavljeni.");
        return;
    }
    if (!currentJobId) {
        showMessage('job-message', "Nije odabran posao za čuvanje.", 'error');
        return;
    }

    showLoading('job-details-loading');
    hideMessage('job-message');

    const jobData = {
        id: currentJobId,
        name: document.getElementById('job-title').value, 
        short_description: document.getElementById('job-short-desc').value,
        long_description: document.getElementById('job-long-desc').value,
        is_active: document.getElementById('job-checkbox').checked
    };

    const url = `${BACKEND_URL}/subcategories/${currentJobId}`; // Backend i dalje koristi 'subcategories'

    fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${googleIdToken}` },
        body: JSON.stringify(jobData)
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) { alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); updateUIForLoggedOutUser(); }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        showMessage('job-message', data.message, 'success');
        loadJobs(true); // Re-load job list and re-select the one that was just saved
    })
    .catch(error => { 
        console.error("Greška pri čuvanju posla:", error); 
        showMessage('job-message', "Greška prilikom čuvanja posla.", 'error'); 
    })
    .finally(() => {
        hideLoading('job-details-loading');
    });
});

document.getElementById('load-jobs-button').addEventListener('click', () => loadJobs());

function loadJobs(reselect = false) {
    if (!googleIdToken) {
        alert("Niste prijavljeni.");
        return;
    }

    showLoading('job-list-loading');
    hideMessage('job-message');

    fetch(`${BACKEND_URL}/subcategories`, { // Backend i dalje koristi 'subcategories'
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
        const jobListElement = document.getElementById('job-list');
        jobListElement.innerHTML = '';
        
        let newlySelectedId = currentJobId;

        if (data.status === 'success' && data.subcategories.length > 0) { // Backend returns 'subcategories'
            data.subcategories.forEach(sub => {
                const listItem = document.createElement('li');
                listItem.className = 'job-list-item';
                listItem.dataset.id = sub.id;
                listItem.innerHTML = `<i class="fas fa-hand-pointer"></i> ${sub.name}`; // Added icon
                listItem.addEventListener('click', () => {
                    selectJob(sub.id);
                });
                jobListElement.appendChild(listItem);
            });
            showMessage('job-message', "Poslovi uspešno učitani.", 'success');
        } else {
            showMessage('job-message', "Nema sačuvanih poslova.", 'info');
        }

        if (reselect && newlySelectedId) {
            selectJob(newlySelectedId);
        } else {
            currentJobId = null;
            document.getElementById('current-job-id').textContent = "Nijedan"; 
            document.getElementById('job-form').style.display = 'none';
            clearJobForm();
        }
    })
    .catch(error => { 
        console.error("Greška pri učitavanju poslova:", error); 
        showMessage('job-message', "Greška prilikom učitavanja poslova.", 'error'); 
    })
    .finally(() => {
        hideLoading('job-list-loading');
    });
}

function selectJob(jobId) {
    document.querySelectorAll('.job-list-item').forEach(item => {
        item.classList.remove('selected');
    });

    const selectedItem = document.querySelector(`.job-list-item[data-id="${jobId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
        loadJobDetails(jobId);
    }
}

function loadJobDetails(jobId) {
    if (!googleIdToken) {
        alert("Niste prijavljeni.");
        return;
    }

    showLoading('job-details-loading');
    hideMessage('job-message');

    fetch(`${BACKEND_URL}/subcategories/${jobId}`, { // Backend i dalje koristi 'subcategories'
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
        if (data.status === 'success' && data.subcategory) { // Backend returns 'subcategory'
            showJobForm(data.subcategory); 
            showMessage('job-message', `Posao "${data.subcategory.name}" učitan.`, 'info');
        } else {
            showMessage('job-message', "Posao nije pronađen.", 'error');
            document.getElementById('job-form').style.display = 'none';
            clearJobForm();
            currentJobId = null;
            document.getElementById('current-job-id').textContent = "Nijedan"; 
        }
    })
    .catch(error => { 
        console.error("Greška pri učitavanju detalja posla:", error); 
        showMessage('job-message', "Greška prilikom učitavanja detalja posla.", 'error'); 
    })
    .finally(() => {
        hideLoading('job-details-loading');
    });
}
