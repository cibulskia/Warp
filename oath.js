const SHEETS = [
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vToqj0JglDOwG_PdfpqiBTA76JnJO9AY38FNnpudB_YevYjhriY6oZbthJeUfqbkPbOdDxf8Aa4R9__/pub?gid=151805995&single=true&output=csv",
  "https://docs.google.com/spreadsheets/d/e/EXAMPLE_SHEET2/pub?output=csv",
  "https://docs.google.com/spreadsheets/d/e/EXAMPLE_SHEET3/pub?output=csv",
  "https://docs.google.com/spreadsheets/d/e/EXAMPLE_SHEET4/pub?output=csv",
  "https://docs.google.com/spreadsheets/d/e/EXAMPLE_SHEET5/pub?output=csv"
];

const gridEl = document.getElementById('grid');
const sheetButtons = document.querySelectorAll('.sheet-buttons button');
const input4El = document.getElementById('input4');
let currentSheetIndex = 0;

async function loadCSV(sheetIndex) {
  const CSV_URL = SHEETS[sheetIndex];
  gridEl.innerHTML = '';
  try {
    const res = await fetch(CSV_URL, { cache: "no-store" });
    const text = await res.text();
    const parsed = Papa.parse(text, { skipEmptyLines: true });
    const rows = parsed.data;

    if (rows.length === 0) return;

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < 5; i++) {
      const headerCell = document.createElement('div');
      headerCell.className = 'header-cell';
      headerCell.textContent = rows[0][i] || `Kolona ${i+1}`;
      fragment.appendChild(headerCell);
    }

    const inputHeader = document.createElement('div');
    inputHeader.className = 'header-cell';
    inputHeader.textContent = 'Unos';
    fragment.appendChild(inputHeader);

    const buttonHeader = document.createElement('div');
    buttonHeader.className = 'header-cell';
    buttonHeader.textContent = 'Akcija';
    fragment.appendChild(buttonHeader);

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r];
      for (let i = 0; i < 5; i++) {
        const div = document.createElement('div');
        div.className = 'cell';
        const cellValue = row[i] || '';
        const urlPattern = /^https?:\/\//i;
        if (urlPattern.test(cellValue.trim())) {
          const link = document.createElement('a');
          link.href = cellValue.trim();
          link.textContent = "PDF";
          link.target = "_blank";
          div.appendChild(link);
        } else {
          div.textContent = cellValue;
        }
        fragment.appendChild(div);
      }

      const inputDiv = document.createElement('div');
      inputDiv.className = 'input-cell';
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Unesi tekst...';
      inputDiv.appendChild(input);
      fragment.appendChild(inputDiv);

      const buttonDiv = document.createElement('div');
      buttonDiv.className = 'button-cell';
      const button = document.createElement('button');
      button.textContent = 'Potvrdi';
      button.addEventListener('click', async () => {
        const firstCell = row[0] || '';
        const newEntry = `${firstCell} - ${input.value}`;

        if (input4El.value) {
          input4El.value += ', ';
        }
        input4El.value += newEntry;
        input.value = '';

        await saveUserData();
      });
      buttonDiv.appendChild(button);
      fragment.appendChild(buttonDiv);
    }

    gridEl.appendChild(fragment);
  } catch (error) {
    console.error("Greška pri učitavanju CSV-a:", error);
  }
}

sheetButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const index = parseInt(btn.dataset.sheet);
    currentSheetIndex = index;
    loadCSV(currentSheetIndex);
    input4El.value = '';
  });
});

const BACKEND_URL = 'https://botanica.ngrok.app';
const SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vToqj0JglDOwG_PdfpqiBTA76JnJO9AY38FNnpudB_YevYjhriY6oZbthJeUfqbkPbOdDxf8Aa4R9__/pub?gid=1502637795&single=true&output=csv';

let googleIdToken = null;
let userName = null;
let userProfilePicUrl = null;
let spreadsheetData = [];

function decodeJwtResponse(token) {
  let base64Url = token.split('.')[1];
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  let jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

async function handleCredentialResponse(response) {
  console.log("Encoded JWT ID token: " + response.credential);
  googleIdToken = response.credential;

  const payload = decodeJwtResponse(response.credential);
  userName = payload.name;
  userProfilePicUrl = payload.picture;

  try {
    const verifyResponse = await fetch(`${BACKEND_URL}/verify-google-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id_token: googleIdToken })
    });

    if (!verifyResponse.ok) throw new Error(`HTTP error! status: ${verifyResponse.status}`);
    const verifyData = await verifyResponse.json();

    if (verifyData.status === 'success') {
      console.log("Login successful on backend:", verifyData);
      updateUIForLoggedInUser();

      const loadResponse = await fetch(`${BACKEND_URL}/load-data`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${googleIdToken}` }
      });

      if (!loadResponse.ok) {
        if (loadResponse.status === 401) { alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); updateUIForLoggedOutUser(); }
        throw new Error(`HTTP error! status: ${loadResponse.status}`);
      }
      const userData = await loadResponse.json();

      document.getElementById('input1').value = userData.input1 || '';
      document.getElementById('input2').value = userData.input2 || '';
      document.getElementById('large-text-input').value = userData.largeText || '';
      document.getElementById('input3').value = userData.input3 || '';
      input4El.value = userData.input4 || '';
      document.getElementById('input5').value = userData.input5 || '';
      document.getElementById('dropdown-input').value = userData.dropdown || '';
      document.getElementById('message').textContent = userData.message || "Podaci uspešno učitani.";

      await loadSpreadsheetData();
      displayDataSectionRows();
    } else {
      console.error("Backend login failed:", verifyData.message);
      alert("Login failed: " + verifyData.message);
      googleIdToken = null;
      userName = null;
      userProfilePicUrl = null;
      updateUIForLoggedOutUser();
    }
  } catch (error) {
    console.error("Error during login process:", error);
    alert("Došlo je do greške prilikom prijave. Molimo pokušajte ponovo.");
    googleIdToken = null;
    userName = null;
    userProfilePicUrl = null;
    updateUIForLoggedOutUser();
  }
}

function updateUIForLoggedInUser() {
  document.getElementById('g_id_onload').style.display = 'none';
  document.querySelector('.g_id_signin').style.display = 'none';
  document.getElementById('app-content').style.display = 'block';
  document.getElementById('user-name').textContent = userName;
  document.getElementById('message').textContent = "";

  const profilePicElement = document.getElementById('user-profile-pic');
  if (userProfilePicUrl) {
    profilePicElement.src = userProfilePicUrl;
    profilePicElement.style.display = 'block';
  } else {
    profilePicElement.style.display = 'none';
  }

  document.getElementById('input1').value = "";
  document.getElementById('input2').value = "";
  document.getElementById('large-text-input').value = "";
  document.getElementById('input3').value = "";
  input4El.value = "";
  document.getElementById('input5').value = "";
  document.getElementById('dropdown-input').value = "";

  for (let i = 1; i <= 4; i++) {
    document.getElementById(`data-field-${i}`).textContent = '';
  }
}

function updateUIForLoggedOutUser() {
  document.getElementById('g_id_onload').style.display = 'block';
  document.querySelector('.g_id_signin').style.display = 'block';
  document.getElementById('app-content').style.display = 'none';
  document.getElementById('user-name').textContent = "";
  document.getElementById('message').textContent = "Molimo prijavite se putem Google-a.";

  const profilePicElement = document.getElementById('user-profile-pic');
  profilePicElement.src = "";
  profilePicElement.style.display = 'none';

  googleIdToken = null;
  userName = null;
  userProfilePicUrl = null;
  document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

  for (let i = 1; i <= 4; i++) {
    document.getElementById(`data-field-${i}`).textContent = '';
  }
}

async function loadSpreadsheetData() {
  try {
    const response = await fetch(SPREADSHEET_URL);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const csvText = await response.text();
    spreadsheetData = csvText.split('\n').map(row => row.split(','));
    console.log("Spreadsheet data loaded:", spreadsheetData);
  } catch (error) {
    console.error("Error loading spreadsheet data:", error);
    document.getElementById('message').textContent = "Greška prilikom učitavanja podataka iz tabele.";
  }
}

function displayDataSectionRows() {
  const input5Value = document.getElementById('input5').value;
  const rowNumbers = input5Value.split(',').map(num => parseInt(num.trim(), 10)).filter(num => !isNaN(num) && num > 0);

  for (let i = 1; i <= 4; i++) {
    const dataField = document.getElementById(`data-field-${i}`);
    dataField.textContent = '';

    const rowIndex = rowNumbers[i - 1];
    if (rowIndex && spreadsheetData[rowIndex - 1]) {
      dataField.textContent = `Red ${rowIndex}:\n${spreadsheetData[rowIndex - 1].join('\n')}`;
    } else if (rowIndex) {
      dataField.textContent = `Red ${rowIndex}: Nema podataka ili nepostojeći red.`;
    }
  }
}

async function saveUserData() {
  if (!googleIdToken) {
    alert("Niste prijavljeni. Molimo prijavite se putem Google-a.");
    return;
  }

  const dataToSave = {
    input1: document.getElementById('input1').value,
    input2: document.getElementById('input2').value,
    largeText: document.getElementById('large-text-input').value,
    input3: document.getElementById('input3').value,
    input4: input4El.value,
    input5: document.getElementById('input5').value,
    dropdown: document.getElementById('dropdown-input').value
  };

  try {
    const response = await fetch(`${BACKEND_URL}/save-data`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${googleIdToken}` },
      body: JSON.stringify(dataToSave)
    });

    if (!response.ok) {
      if (response.status === 401) { alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); updateUIForLoggedOutUser(); }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    document.getElementById('message').textContent = data.message;
    displayDataSectionRows();
  } catch (error) {
    console.error("Error saving data:", error);
    document.getElementById('message').textContent = "Greška prilikom čuvanja podataka.";
  }
}

window.addEventListener('load', () => {
  loadCSV(currentSheetIndex);
  updateUIForLoggedOutUser();
});

document.getElementById('save-button').addEventListener('click', saveUserData);

document.getElementById('load-button').addEventListener('click', async () => {
  if (!googleIdToken) {
    alert("Niste prijavljeni. Molimo prijavite se putem Google-a.");
    return;
  }

  try {
    const response = await fetch(`${BACKEND_URL}/load-data`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${googleIdToken}` }
    });

    if (!response.ok) {
      if (response.status === 401) { alert("Vaša sesija je istekla. Molimo prijavite se ponovo."); updateUIForLoggedOutUser(); }
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();

    document.getElementById('input1').value = data.input1 || '';
    document.getElementById('input2').value = data.input2 || '';
    document.getElementById('large-text-input').value = data.largeText || '';
    document.getElementById('input3').value = data.input3 || '';
    input4El.value = data.input4 || '';
    document.getElementById('input5').value = data.input5 || '';
    document.getElementById('dropdown-input').value = data.dropdown || '';

    document.getElementById('message').textContent = data.message;

    await loadSpreadsheetData();
    displayDataSectionRows();
  } catch (error) {
    console.error("Error loading data:", error);
    document.getElementById('message').textContent = "Greška prilikom učitavanja podataka.";
  }
});

document.getElementById('input5').addEventListener('input', displayDataSectionRows);

document.getElementById('signout-button').addEventListener('click', () => {
  if (google.accounts.id) {
    google.accounts.id.disableAutoSelect();
    google.accounts.id.revoke(userName, done => {
      console.log('consent revoked', done);
    });
  }

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
