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
  let jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
  return JSON.parse(jsonPayload);
}

// ... ostatak funkcija: handleCredentialResponse, updateUIForLoggedInUser, updateUIForLoggedOutUser, loadSpreadsheetData, displayDataSectionRows, saveUserData
// ... Event listeneri: save-button, load-button, input5, signout-button
// Zbog dužine, ostatak koda iz index.html se direktno prebaci ovde bez promena.

window.addEventListener('load', () => {
  loadCSV(currentSheetIndex);
  updateUIForLoggedOutUser();
});
