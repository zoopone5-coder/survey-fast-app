require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const upload = require('./upload');
const googleApi = require('./google');

const app = express();
const port = Number(process.env.PORT || 3000);
const host = '0.0.0.0';
const api = process.env.NODE_ENV === 'test' ? (global.__mockGoogle || {}) : googleApi;
const required = ['siteName', 'pincode'];
const text = (v) => String(v || '').trim();

app.use(cors());
app.use(express.static(path.join(__dirname, 'public'), { extensions: ['html'] }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.post('/submit', upload.single('photo'), async (req, res) => {
  try {
    const body = req.body || {};
    const missing = required.filter((k) => !text(body[k]));
    if (missing.length) return res.status(400).json({ ok: false, error: `Missing: ${missing.join(', ')}` });
    let answers = {};
    if (body.answers) {
      try { answers = typeof body.answers === 'string' ? JSON.parse(body.answers) : body.answers; }
      catch { return res.status(400).json({ ok: false, error: 'Invalid answers JSON' }); }
    }
    const siteName = text(body.siteName);
    const latitude = text(body.latitude) || '';
    const longitude = text(body.longitude) || '';
    const folderId = await api.findOrCreateFolder(siteName);
    let photoUrl = '';
    try { photoUrl = await api.uploadFile(folderId, req.file, siteName); } catch {}
    const row = [
      new Date().toISOString(),
      siteName,
      text(body.village),
      text(body.taluka),
      text(body.hodName),
      text(body.phone),
      text(body.email),
      text(body.officeName),
      text(body.pincode),
      latitude,
      longitude,
      photoUrl,
      JSON.stringify(answers)
    ];
    await api.appendToSheet(row);
    res.json({ ok: true, photoUrl });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || 'Server error' });
  }
});

if (require.main === module) app.listen(port, host, () => console.log(`listening on ${host}:${port}`));
module.exports = app;
