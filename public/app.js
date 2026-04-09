const form = document.getElementById('surveyForm');
const msg = document.getElementById('msg');
const gps = document.getElementById('gps');
const submitBtn = document.getElementById('submitBtn');
const photoInput = document.getElementById('photo');
const fileInfo = document.getElementById('fileInfo');
const preview = document.getElementById('preview');
const downloadLink = document.getElementById('downloadLink');
let coords = { latitude: '', longitude: '' };
let stampedPhoto = null;
let stampedPhotoUrl = '';

function setMsg(text, bad) { msg.textContent = text; msg.style.color = bad ? '#b00020' : '#0a7a28'; }
function setReady(isReady) { submitBtn.disabled = !isReady; }

function getGps() {
  if (!navigator.geolocation) return gps.textContent = 'GPS unavailable';
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      coords.latitude = String(pos.coords.latitude);
      coords.longitude = String(pos.coords.longitude);
      gps.textContent = `GPS: ${coords.latitude}, ${coords.longitude}`;
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
    `Time: ${new Date().toLocaleString()}`
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
      resolve({
        file: new File([blob], `survey-${Date.now()}.jpg`, { type: 'image/jpeg' }),
        url: canvas.toDataURL('image/jpeg', 0.9)
      });
    }, 'image/jpeg', 0.9);
  });
}

async function refreshStampedPreview() {
  const originalPhoto = photoInput.files[0];
  if (!originalPhoto) {
    stampedPhoto = null;
    preview.style.display = 'none';
    downloadLink.style.display = 'none';
    fileInfo.textContent = 'No photo selected';
    setReady(false);
    return;
  }
  fileInfo.textContent = `Selected: ${originalPhoto.name}`;
  setReady(false);
  setMsg('Preparing stamped photo...', false);
  const stamped = await buildWatermarkedPhoto(originalPhoto);
  stampedPhoto = stamped.file;
  stampedPhotoUrl = stamped.url;
  preview.src = stampedPhotoUrl;
  preview.style.display = 'block';
  downloadLink.href = stampedPhotoUrl;
  downloadLink.style.display = 'block';
  fileInfo.textContent = `Ready: ${stampedPhoto.name}`;
  setReady(true);
  setMsg('Stamped photo ready. Download if you want a phone copy, then submit.', false);
}

photoInput.addEventListener('change', async () => {
  try { await refreshStampedPreview(); }
  catch (error) {
    stampedPhoto = null;
    preview.style.display = 'none';
    downloadLink.style.display = 'none';
    fileInfo.textContent = 'Photo processing failed';
    setReady(false);
    setMsg(error.message, true);
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitBtn.disabled = true;
  setMsg('Submitting...', false);
  try {
    const originalPhoto = photoInput.files[0];
    if (!originalPhoto) throw new Error('Photo is required');
    if (!stampedPhoto) await refreshStampedPreview();
    const data = new FormData(form);
    data.set('latitude', coords.latitude);
    data.set('longitude', coords.longitude);
    data.set('photo', stampedPhoto);
    const res = await fetch('/submit', { method: 'POST', body: data });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || 'Submit failed');
    form.reset();
    coords = { latitude: '', longitude: '' };
    stampedPhoto = null;
    stampedPhotoUrl = '';
    gps.textContent = 'GPS: waiting';
    fileInfo.textContent = 'No photo selected';
    preview.removeAttribute('src');
    preview.style.display = 'none';
    downloadLink.removeAttribute('href');
    downloadLink.style.display = 'none';
    setReady(false);
    getGps();
    setMsg(json.warning ? `Saved with warning: ${json.warning}` : 'Saved successfully', false);
  } catch (error) {
    setMsg(error.message, true);
  } finally {
    submitBtn.disabled = false;
  }
});

getGps();
