const BACKEND_URL = 'https://botanica.ngrok.app'; // Tvoja ngrok adresa

let googleIdToken = null;
let userName = null;
let currentJobId = null;
let userPicture = null; // dodat za profilnu sliku

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
    messageElement.className = `info-message ${type}`; 
    messageElement.style.display = 'block';
}

function hideMessage(elementId) {
    const messageElement = document.getElementById(elementId);
    messageElement.style.display = 'none';
    messageElement.textContent = '';
    messageElement.className = 'info-message';
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
            userPicture = data.user_picture || null; // backend treba da vrati URL slike
            updateUIForLoggedInUser();
            loadJobs();
        } else {
            console.error("Backend login failed:", data.message);
            alert("Prijava neuspešna: " + data.message);
            googleIdToken = null;
            userName = null;
            userPicture = null;
            updateUIForLoggedOutUser();
        }
    })
    .catch(error => {
        console.error("Greška tokom verifikacije prijave na backendu:", error);
        alert("Došlo je do greške tokom prijave. Molimo pokušajte ponovo.");
        googleIdToken = null;
        userName = null;
        userPicture = null;
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
    document.getElementById('signout-button').style.display = 'flex';

    hideMessage('message');
    hideMessage('job-message');

    // Profilna slika
    const profileImg = document.getElementById('profile-picture');
    if(userPicture) {
        profileImg.src = userPicture;
        profileImg.style.display = 'block';
    } else {
        profileImg.style.display = 'none';
    }

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
    document.querySelectorAll('.job-list-item').forEach(item => item.classList.remove('selected'));
}

function updateUIForLoggedOutUser() {
    document.getElementById('welcome-message').style.display = 'flex';
    document.getElementById('g_id_onload').style.display = 'block';
    document.querySelector('.g_id_signin').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('job-sidebar').style.display = 'none';
    document.getElementById('user-name').textContent = "";
    document.getElementById('signout-button').style.display = 'none';

    const profileImg = document.getElementById('profile-picture');
    profileImg.style.display = 'none';
    profileImg.src = '';

    showMessage('message', "Molimo prijavite se putem Google-a.", 'info');
    hideMessage('job-message');

    googleIdToken = null;
    userName = null;
    userPicture = null;
    document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.getElementById('job-list').innerHTML = '';
}

// --- ostatak JS koda ostaje identičan originalnom ---
// (save/load settings, jobs functions, PDF iframe, signout button itd.)
