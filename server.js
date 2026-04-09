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
app.get('/', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.get('/reverse-geocode', async (req, res) => {
  try {
    const latitude = text(req.query.latitude);
    const longitude = text(req.query.longitude);
    if (!latitude || !longitude) return res.status(400).json({ ok: false, error: 'Missing latitude/longitude' });
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('lat', latitude);
    url.searchParams.set('lon', longitude);
    url.searchParams.set('zoom', '18');
    url.searchParams.set('addressdetails', '1');
    const geo = await fetch(url, {
      headers: { 'User-Agent': process.env.GEOCODER_USER_AGENT || 'survey-fast-app/1.0' }
    });
    if (!geo.ok) throw new Error('Reverse geocoding failed');
    const json = await geo.json();
    res.json({ ok: true, pincode: json?.address?.postcode || '' });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || 'Reverse geocode error' });
  }
});

app.post('/submit', upload.single('photo'), async (req, res) => {
  try {
    const body = req.body || {};
    const missing = required.filter((k) => !text(body[k]));
    if (missing.length) return res.status(400).json({ ok: false, error: `Missing: ${missing.join(', ')}` });
    const siteName = text(body.siteName);
    const latitude = text(body.latitude) || '';
    const longitude = text(body.longitude) || '';
    const photoLabel = text(body.photoNames) || 'Saved on phone';
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
      photoLabel,
      text(body.remarks)
    ];
    await api.appendToSheet(row);
    res.json({ ok: true, photoLabel });
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message || 'Server error' });
  }
});

if (require.main === module) app.listen(port, host, () => console.log(`listening on ${host}:${port}`));
module.exports = app;
