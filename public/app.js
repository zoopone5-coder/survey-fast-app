const form = document.getElementById('surveyForm');
const msg = document.getElementById('msg');
const gps = document.getElementById('gps');
const submitBtn = document.getElementById('submitBtn');
const photoInput = document.getElementById('photo');
const fileInfo = document.getElementById('fileInfo');
const downloadAllBtn = document.getElementById('downloadAllBtn');
const gallery = document.getElementById('gallery');
let coords = { latitude: '', longitude: '' };
let stampedPhotos = [];
let downloadReady = false;

function setMsg(text, bad) { msg.textContent = text; msg.style.color = bad ? '#b00020' : '#0a7a28'; }
function setReady() { submitBtn.disabled = !(stampedPhotos.length && downloadReady); }
function pad(n) { return String(n).padStart(2, '0'); }
function nowStamp() {
  const d = new Date();
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}_${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}
function displayDate() {
  const d = new Date();
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}
function siteBase() {
  return (form.siteName.value.trim() || 'site').replace(/[<>:"/\\|?*\u0000-\u001f]+/g, '-').replace(/\s+/g, '_').slice(0, 80);
}
async function fillPincodeFromGps() {
  if (!coords.latitude || !coords.longitude || form.pincode.value.trim()) return;
  try {
    const res = await fetch(`/reverse-geocode?latitude=${encodeURIComponent(coords.latitude)}&longitude=${encodeURIComponent(coords.longitude)}`);
    const json = await res.json();
    if (res.ok && json.ok && json.pincode) form.pincode.value = json.pincode;
  } catch {}
}

function getGps() {
  if (!navigator.geolocation) return gps.textContent = 'GPS unavailable';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      coords.latitude = String(pos.coords.latitude);
      coords.longitude = String(pos.coords.longitude);
      gps.textContent = `GPS: ${coords.latitude}, ${coords.longitude}`;
      fillPincodeFromGps();
    },
    () => { gps.textContent = 'GPS denied, submit will continue'; },
    { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
  );
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Photo could not be read')); };
    img.src = url;
  });
}

async function buildWatermarkedPhoto(file) {
  const img = await loadImage(file);
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * scale));
  const height = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const siteName = form.siteName.value.trim();
  const pincode = form.pincode.value.trim();
  const stamp = [
    `Site: ${siteName || '-'}`,
    `Pincode: ${pincode || '-'}`,
    `GPS: ${coords.latitude || '-'}, ${coords.longitude || '-'}`,
    `Date: ${displayDate()}`
  ];
  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);
  const fontSize = Math.max(18, Math.round(width * 0.026));
  const lineHeight = Math.round(fontSize * 1.3);
  const boxHeight = lineHeight * stamp.length + 20;
  ctx.fillStyle = 'rgba(0,0,0,0.58)';
  ctx.fillRect(0, height - boxHeight, width, boxHeight);
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${fontSize}px sans-serif`;
  stamp.forEach((line, index) => ctx.fillText(line, 12, height - boxHeight + 18 + ((index + 1) * lineHeight)));
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Photo processing failed'));
      resolve({ blob, url: canvas.toDataURL('image/jpeg', 0.9) });
    }, 'image/jpeg', 0.9);
  });
}

async function refreshStampedPreview() {
  const originals = Array.from(photoInput.files || []);
  if (!originals.length) {
    stampedPhotos = [];
    gallery.innerHTML = '';
    fileInfo.textContent = 'No photo selected';
    downloadReady = false;
    downloadAllBtn.style.display = 'none';
    setReady();
    return;
  }
  const ts = nowStamp();
  const base = siteBase();
  fileInfo.textContent = `${originals.length} photo(s) selected`;
  gallery.innerHTML = '';
  stampedPhotos = [];
  downloadReady = false;
  downloadAllBtn.style.display = 'none';
  setReady();
  setMsg('Preparing stamped photo...', false);
  for (let i = 0; i < originals.length; i += 1) {
    const stamped = await buildWatermarkedPhoto(originals[i]);
    const name = originals.length === 1 ? `${base}_${ts}.jpg` : `${base}_${i + 1}.jpg`;
    const file = new File([stamped.blob], name, { type: 'image/jpeg' });
    stampedPhotos.push(file);
    const wrap = document.createElement('div');
    const img = document.createElement('img');
    img.className = 'preview';
    img.alt = name;
    img.src = stamped.url;
    wrap.appendChild(img);
    gallery.appendChild(wrap);
  }
  downloadAllBtn.style.display = 'block';
  fileInfo.textContent = `Ready: ${stampedPhotos.map((f) => f.name).join(', ')}`;
  setMsg('Stamped photo ready. Tap Download all photos, then submit.', false);
}

photoInput.addEventListener('change', async () => {
  try { await refreshStampedPreview(); }
  catch (error) {
    stampedPhotos = [];
    gallery.innerHTML = '';
    fileInfo.textContent = 'Photo processing failed';
    downloadReady = false;
    downloadAllBtn.style.display = 'none';
    setReady();
    setMsg(error.message, true);
  }
});

downloadAllBtn.addEventListener('click', () => {
  stampedPhotos.forEach((file) => {
    const url = URL.createObjectURL(file);
    const link = document.createElement('a');
    link.href = url;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  downloadReady = true;
  downloadAllBtn.textContent = 'Downloaded all photos';
  setReady();
  setMsg('All stamped photos downloaded. Submit is now enabled.', false);
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitBtn.disabled = true;
  setMsg('Submitting...', false);
  try {
    if (!photoInput.files.length) throw new Error('Photo is required');
    if (!stampedPhotos.length) await refreshStampedPreview();
    if (!downloadReady) throw new Error('Download all stamped photos first');
    const data = new FormData(form);
    data.set('latitude', coords.latitude);
    data.set('longitude', coords.longitude);
    data.set('photoNames', stampedPhotos.map((file) => file.name).join(', '));
    const res = await fetch('/submit', { method: 'POST', body: data });
    const raw = await res.text();
    let json;
    try { json = JSON.parse(raw); }
    catch { throw new Error(raw.includes('<!DOCTYPE') ? 'Server is still running old version. Update GitHub and Manual sync Render.' : raw || 'Submit failed'); }
    if (!res.ok || !json.ok) throw new Error(json.error || 'Submit failed');
    form.reset();
    coords = { latitude: '', longitude: '' };
    stampedPhotos = [];
    downloadReady = false;
    gps.textContent = 'GPS: waiting';
    fileInfo.textContent = 'No photo selected';
    gallery.innerHTML = '';
    downloadAllBtn.style.display = 'none';
    downloadAllBtn.textContent = 'Download all photos';
    setReady();
    getGps();
    setMsg(`Saved successfully. Photo names: ${json.photoLabel || 'Saved on phone'}`, false);
  } catch (error) {
    setMsg(error.message, true);
  } finally {
    setReady();
  }
});

getGps();
