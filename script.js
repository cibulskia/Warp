const BACKEND_URL = 'https://botanica.ngrok.app'; // Tvoja ngrok adresa

let googleIdToken = null; // Token dobijen od Google-a
let userName = null;     // Ime korisnika

function handleCredentialResponse(response) {
    // Ovo se poziva kada korisnik uspešno prijavi putem Google-a
    console.log("Encoded JWT ID token: " + response.credential);
    googleIdToken = response.credential;

    // Pošalji ID token backendu radi validacije i dobijanja session tokena
    fetch(`${BACKEND_URL}/verify-google-login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id_token: googleIdToken })
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        if (data.status === 'success') {
            // Backend je uspešno validirao token i postavio sesiju
            console.log("Login successful on backend:", data);
            userName = data.user_name;
            updateUIForLoggedInUser();
        } else {
            console.error("Backend login failed:", data.message);
            alert("Login failed: " + data.message);
            googleIdToken = null;
            userName = null;
            updateUIForLoggedOutUser();
        }
    })
    .catch(error => {
        console.error("Error during backend login verification:", error);
        alert("An error occurred during login. Please try again.");
        googleIdToken = null;
        userName = null;
        updateUIForLoggedOutUser();
    });
}

function updateUIForLoggedInUser() {
    document.getElementById('g_id_onload').style.display = 'none';
    document.querySelector('.g_id_signin').style.display = 'none';
    document.getElementById('app-content').style.display = 'block';
    document.getElementById('user-name').textContent = userName;
    document.getElementById('message').textContent = ""; // Clear any previous messages
    document.getElementById('data-input').value = ""; // Clear input field
}

function updateUIForLoggedOutUser() {
    document.getElementById('g_id_onload').style.display = 'block';
    document.querySelector('.g_id_signin').style.display = 'block';
    document.getElementById('app-content').style.display = 'none';
    document.getElementById('user-name').textContent = "";
    document.getElementById('message').textContent = "Molimo prijavite se putem Google-a.";
    googleIdToken = null;
    userName = null;
    // Remove session cookie from frontend if any (not strictly necessary as backend manages it)
    document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}


// Provera statusa prijave prilikom učitavanja stranice
// Ovo bi trebalo da se oslanja na backend sesiju, ali za prvu ruku možemo proveriti token
window.onload = function() {
    // Ako postoji Google ID token u lokalnom skladištu (ili bolja metoda je pitati backend)
    // Nećemo ga čuvati lokalno zbog sigurnosti, već se oslanjamo na backend sesiju.
    // Ako korisnik osveži stranicu, backend treba da potvrdi sesiju.
    // Za jednostavnost, ako je bio prijavljen, UI će se ažurirati nakon što backend potvrdi.
    updateUIForLoggedOutUser(); // Počinjemo kao odjavljeni
};


document.getElementById('save-button').addEventListener('click', () => {
    const textData = document.getElementById('data-input').value;
    if (!googleIdToken) {
        alert("Niste prijavljeni. Molimo prijavite se putem Google-a.");
        return;
    }

    fetch(`${BACKEND_URL}/save-data`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${googleIdToken}` // Šaljemo Google ID token za autorizaciju
        },
        body: JSON.stringify({ data: textData })
    })
    .then(response => {
        if (!response.ok) {
            // Ako je sesija istekla ili token nevalidan, backend će vratiti 401
            if (response.status === 401) {
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo.");
                updateUIForLoggedOutUser();
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        document.getElementById('message').textContent = data.message;
    })
    .catch(error => {
        console.error("Error saving data:", error);
        document.getElementById('message').textContent = "Greška prilikom čuvanja podataka.";
    });
});

document.getElementById('load-button').addEventListener('click', () => {
    if (!googleIdToken) {
        alert("Niste prijavljeni. Molimo prijavite se putem Google-a.");
        return;
    }

    fetch(`${BACKEND_URL}/load-data`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${googleIdToken}` // Šaljemo Google ID token za autorizaciju
        }
    })
    .then(response => {
        if (!response.ok) {
            if (response.status === 401) {
                alert("Vaša sesija je istekla. Molimo prijavite se ponovo.");
                updateUIForLoggedOutUser();
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        document.getElementById('data-input').value = data.data || '';
        document.getElementById('message').textContent = data.message;
    })
    .catch(error => {
        console.error("Error loading data:", error);
        document.getElementById('message').textContent = "Greška prilikom učitavanja podataka.";
    });
});

document.getElementById('signout-button').addEventListener('click', () => {
    // Odjava sa Google-a (ako je potrebno)
    // google.accounts.id.disableAutoSelect(); // Ako ste koristili auto_select
    // U našem slučaju, uglavnom je dovoljno obrisati lokalne tokene i backend sesiju
    googleIdToken = null;
    userName = null;
    updateUIForLoggedOutUser();

    // Pošalji zahtev backendu da uništi sesiju
    fetch(`${BACKEND_URL}/logout`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
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
