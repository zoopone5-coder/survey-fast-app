const fs = require('node:fs');
const path = require('node:path');

const envPath = path.join(__dirname, '.env');
const examplePath = path.join(__dirname, '.env.example');

if (!fs.existsSync(envPath)) {
  fs.copyFileSync(examplePath, envPath);
  console.log('.env created from .env.example');
} else {
  console.log('.env already exists');
}

console.log('');
console.log('Next steps:');
console.log('1. Put your Google service account JSON file in this folder or set GOOGLE_SERVICE_ACCOUNT_JSON');
console.log('2. Open .env and fill GOOGLE_APPLICATION_CREDENTIALS, GOOGLE_DRIVE_ROOT_FOLDER_ID, GOOGLE_SHEET_ID');
console.log('3. Share your Google Sheet and Drive root folder with the service account email as Editor');
console.log('4. Run: npm start');
