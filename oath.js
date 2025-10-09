/* oath.js
   Sadrži:
   - Google One Tap / GSI inicijalizaciju i handler za credential response
   - Funkcije koje komuniciraju sa backendom (placeholders / primeri sa fetch)
   - Funkcije koje upravljaju trenutnim ID-jem potkategorije (get/set)
   - Izvodi (exports) na window namespace koji se pozivaju iz glavnog HTML/JS
*/

/* ====== CONFIG ====== */
// Promeni na svoj backend URL kada bude spremno:
const BACKEND_BASE_URL = "https://tvoj-backend.example.com/api"; // <-- zameni sa stvarnim
const GOOGLE_CLIENT_ID = "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"; // <-- zameni sa stvarnim

/* ====== Interni state ====== */
let authToken = null; // token dobijen od backend-a (session) ili id-token iz Google-a
let currentSubcategoryId = null;

/* ====== Google Identity Services inicijalizacija ====== */
function handleCredentialResponse(response) {
    // response.credential sadrži JWT ID token od Google-a
    // Pošaljemo ga backendu da ga backend verifikuje i otvori session
    if (!response || !response.credential) {
        console.warn("Nema credential-a od GSI.");
        return;
    }

    // Example: pogodak na backend za prijavu
    fetch(`${BACKEND_BASE_URL}/auth/google`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ id_token: response.credential })
    })
    .then(res => {
        if (!res.ok) throw new Error("Autentikacija nije uspela na backendu.");
        return res.json();
    })
    .then(data => {
        // backend može vratiti svoj session token (npr. JWT)
        authToken = data.token || null;

        // backend može vratiti i ime / profil: u ovom primeru pretpostavljamo da
        // vratni objekat ima { user: { name, picture } }
        const userName = data.user?.name || "Nepoznati";
        const userPicture = data.user?.picture || null;

        // Pozovemo UI funkciju iz glavnog fajla koja će prikazati aplikaciju
        if (window.updateUIForLoggedInUser) {
            window.updateUIForLoggedInUser(userName, userPicture);
        } else {
            console.warn("updateUIForLoggedInUser nije pronađen na window-u.");
        }
    })
    .catch(err => {
        console.error("Greška pri autentikaciji:", err);
        alert("Greška pri prijavi. Proverite konzolu za detalje.");
    });
}

function initGSI() {
    if (typeof google === "undefined" || !google.accounts || !google.accounts.id) {
        console.warn("GSI (google.accounts.id) nije dostupan. Proveri da li je uključen <script src=\"https://accounts.google.com/gsi/client\" async defer></script> u HTML-u.");
        return;
    }

    google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleCredentialResponse,
        // opcije: auto_select, cancel_on_tap_outside, itd.
    });

    // Prikaži dugme za sign-in (možeš ciljano promeniti element ID)
    google.accounts.id.renderButton(
        document.getElementById("g_id_signin_button") || document.querySelector(".g_id_signin"),
        { theme: "outline", size: "large" }
    );

    // Option: prikaz One Tap
    // google.accounts.id.prompt(); // aktiviraj ako želiš One Tap
}

/* ====== Backend komunikacione funkcije (primeri) ====== */

// Helper za autorizovani fetch
function authFetch(path, opts = {}) {
    const headers = opts.headers || {};
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
    if (authToken) headers["Authorization"] = `Bearer ${authToken}`;
    const newOpts = Object.assign({}, opts, { headers });
    return fetch(`${BACKEND_BASE_URL}${path}`, newOpts)
        .then(res => {
            if (!res.ok) {
                // pokušaj parsirati JSON grešku
                return res.json().then(j => { throw j; }).catch(() => { throw new Error("Network error"); });
            }
            return res.json();
        });
}

// Primer: sačuvaj glavne podatke (poziv iz UI)
function saveMainData() {
    // U praksi prikupi podatke iz DOM-a pre slanja.
    const payload = {
        // primer podataka
        timestamp: Date.now()
    };

    return authFetch("/main/save", {
        method: "POST",
        body: JSON.stringify(payload)
    })
    .then(r => {
        console.log("Sačuvano na backendu:", r);
        alert("Podaci uspešno sačuvani.");
        return r;
    })
    .catch(e => {
        console.error("Greška pri čuvanju:", e);
        alert("Greška pri čuvanju podataka.");
        throw e;
    });
}

// Primer: učitaj podatke
function loadMainData() {
    return authFetch("/main/load", { method: "GET" })
    .then(r => {
        console.log("Učitano sa backend-a:", r);
        // Prosledi podatke UI-ju ako treba
        // Možeš pozvati window.someHandler(...) ovde
        return r;
    })
    .catch(e => {
        console.error("Greška pri učitavanju:", e);
        alert("Greška pri učitavanju podataka.");
        throw e;
    });
}

// Sign out
function signOutUser() {
    // Pozovi backend da ugasi session, ako postoji
    if (authToken) {
        return fetch(`${BACKEND_BASE_URL}/auth/logout`, {
            method: "POST",
            headers: { "Authorization": `Bearer ${authToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({})
        }).catch(err => console.warn("Greška pri logout pozivu:", err));
    } else {
        // ako nema tokena, jednostavno resetuj UI state
        if (window.updateUIForLoggedOutUser) window.updateUIForLoggedOutUser();
        return Promise.resolve();
    }
}

/* ====== Potkategorije: save / delete / load ====== */

function saveSubcategory(subcategoryData, isNew = true, id = null) {
    const path = isNew ? "/subcategories" : `/subcategories/${id}`;
    const method = isNew ? "POST" : "PUT";
    return authFetch(path, {
        method,
        body: JSON.stringify(subcategoryData)
    }).then(res => {
        console.log("saveSubcategory:", res);
        if (window.loadSubcategoriesFromBackend) window.loadSubcategoriesFromBackend(false);
        return res;
    }).catch(err => {
        console.error("Greška pri čuvanju potkategorije:", err);
        alert("Greška pri čuvanju potkategorije.");
        throw err;
    });
}

function deleteSubcategory(id) {
    if (!id) {
        alert("Nije selektovana potkategorija za brisanje.");
        return Promise.reject(new Error("No id"));
    }
    return authFetch(`/subcategories/${id}`, { method: "DELETE" })
    .then(res => {
        console.log("deleteSubcategory:", res);
        if (window.loadSubcategoriesFromBackend) window.loadSubcategoriesFromBackend(false);
        return res;
    }).catch(err => {
        console.error("Greška pri brisanju:", err);
        alert("Greška pri brisanju potkategorije.");
        throw err;
    });
}

function loadSubcategoriesFromBackend(reselect = false) {
    return authFetch("/subcategories", { method: "GET" })
    .then(res => {
        // očekujemo niz potkategorija
        const list = res.subcategories || res; // fallback
        // renderuj u DOM (ako u UI postoji handler)
        if (window.renderSubcategoryList) {
            window.renderSubcategoryList(list, reselect);
        } else {
            // fallback rendering ako nema renderSubcategoryList
            const container = document.getElementById('subcategory-list');
            if (container) {
                container.innerHTML = '';
                list.forEach(s => {
                    const li = document.createElement('div');
                    li.className = 'subcategory-list-item';
                    li.dataset.id = s.id;
                    li.textContent = s.name || `Potkategorija ${s.id}`;
                    li.addEventListener('click', () => {
                        if (window.selectSubcategory) window.selectSubcategory(s.id);
                    });
                    container.appendChild(li);
                });
            }
        }
        return list;
    })
    .catch(err => {
        console.error("Greška pri učitavanju potkategorija:", err);
        throw err;
    });
}

function loadSubcategoryDetailsFromBackend(subcategoryId) {
    if (!subcategoryId) return Promise.reject(new Error("subcategoryId required"));
    return authFetch(`/subcategories/${subcategoryId}`, { method: "GET" })
    .then(res => {
        if (window.showSubcategoryForm) {
            window.showSubcategoryForm(res);
        }
        return res;
    })
    .catch(err => {
        console.error("Greška pri učitavanju detalja:", err);
        throw err;
    });
}

/* ====== Current subcategory getters/setters (window API) ====== */
function setCurrentSubcategoryId(id) {
    currentSubcategoryId = id;
}
function getCurrentSubcategoryId() {
    return currentSubcategoryId;
}

/* ====== Expose to window so glavni HTML/JS može da ih pozove ====== */
window.initGSI = initGSI;
window.saveMainData = saveMainData;
window.loadMainData = loadMainData;
window.signOutUser = function() {
    // lokalni cleanup UI i token
    authToken = null;
    currentSubcategoryId = null;
    if (window.updateUIForLoggedOutUser) window.updateUIForLoggedOutUser();
    // pokušaj backend logout
    signOutUser();
};
window.saveSubcategory = saveSubcategory;
window.deleteSubcategory = deleteSubcategory;
window.loadSubcategoriesFromBackend = loadSubcategoriesFromBackend;
window.loadSubcategoryDetailsFromBackend = loadSubcategoryDetailsFromBackend;
window.setCurrentSubcategoryId = setCurrentSubcategoryId;
window.getCurrentSubcategoryId = getCurrentSubcategoryId;

/* ====== Auto inicijalizacija ako je potrebno - pozovi iz HTML-a posle učitavanja google script-a ====== */
