const { google } = require('googleapis');

const scopes = ['https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.GoogleAuth({
  credentials: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) : undefined,
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
  scopes
});
const sheets = google.sheets({ version: 'v4', auth });

async function retryOnce(fn) {
  try { return await fn(); }
  catch (error) {
    const code = error?.code || error?.response?.status;
    if (![429, 500, 502, 503, 504].includes(code)) throw error;
    return fn();
  }
}

async function appendToSheet(row) {
  if (!process.env.GOOGLE_SHEET_ID) throw new Error('Missing GOOGLE_SHEET_ID');
  await retryOnce(() => sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: process.env.GOOGLE_SHEET_RANGE || 'Sheet1!A:M',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] }
  }));
}

module.exports = { appendToSheet };
