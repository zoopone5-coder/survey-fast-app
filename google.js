const { Readable } = require('stream');
const { google } = require('googleapis');

const scopes = ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/spreadsheets'];
const auth = new google.auth.GoogleAuth({
  credentials: process.env.GOOGLE_SERVICE_ACCOUNT_JSON ? JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON) : undefined,
  keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS || undefined,
  scopes
});
const drive = google.drive({ version: 'v3', auth });
const sheets = google.sheets({ version: 'v4', auth });
const folderCache = new Map();
const folderLocks = new Map();
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const qv = (s) => `'${esc(s)}'`;

async function retryOnce(fn) {
  try { return await fn(); }
  catch (error) {
    const code = error?.code || error?.response?.status;
    if (![429, 500, 502, 503, 504].includes(code)) throw error;
    return fn();
  }
}

async function withSiteLock(siteKey, work) {
  const previous = folderLocks.get(siteKey) || Promise.resolve();
  let release;
  const current = new Promise((resolve) => { release = resolve; });
  folderLocks.set(siteKey, previous.then(() => current));
  await previous;
  try { return await work(); }
  finally {
    release();
    if (folderLocks.get(siteKey) === current) folderLocks.delete(siteKey);
  }
}

async function findOrCreateFolder(siteName) {
  const root = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  const siteKey = siteName.trim().toLowerCase();
  if (!root) throw new Error('Missing GOOGLE_DRIVE_ROOT_FOLDER_ID');
  if (folderCache.has(siteKey)) return folderCache.get(siteKey);
  return withSiteLock(siteKey, async () => {
    if (folderCache.has(siteKey)) return folderCache.get(siteKey);
    const q = [
      `name=${qv(siteName.trim())}`,
      `'${esc(root)}' in parents`,
      `mimeType='application/vnd.google-apps.folder'`,
      'trashed=false'
    ].join(' and ');
    const found = await retryOnce(() => drive.files.list({ q, fields: 'files(id,name)', pageSize: 1 }));
    const existing = found.data.files?.[0]?.id;
    if (existing) return folderCache.set(siteKey, existing).get(siteKey);
    const created = await retryOnce(() => drive.files.create({
      requestBody: { name: siteName.trim(), parents: [root], mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id'
    }));
    return folderCache.set(siteKey, created.data.id).get(siteKey);
  });
}

async function uploadFile(folderId, file, siteName) {
  if (!file?.buffer?.length) return '';
  const created = await retryOnce(() => drive.files.create({
    requestBody: { name: `${siteName.trim()}-${Date.now()}-${file.originalname || 'photo.jpg'}`, parents: [folderId] },
    media: { mimeType: file.mimetype || 'application/octet-stream', body: Readable.from(file.buffer) },
    fields: 'id,webViewLink'
  }));
  await retryOnce(() => drive.permissions.create({ fileId: created.data.id, requestBody: { role: 'reader', type: 'anyone' } }));
  return created.data.webViewLink || `https://drive.google.com/file/d/${created.data.id}/view`;
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

module.exports = { findOrCreateFolder, uploadFile, appendToSheet };
