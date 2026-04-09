const form = document.getElementById('surveyForm');
const msg = document.getElementById('msg');
const gps = document.getElementById('gps');
const submitBtn = document.getElementById('submitBtn');
const photoInput = document.getElementById('photo');
let coords = { latitude: '', longitude: '' };

function setMsg(text, bad) { msg.textContent = text; msg.style.color = bad ? '#b00020' : '#0a7a28'; }

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
      resolve(new File([blob], `survey-${Date.now()}.jpg`, { type: 'image/jpeg' }));
    }, 'image/jpeg', 0.9);
  });
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitBtn.disabled = true;
  setMsg('Submitting...', false);
  try {
    const originalPhoto = photoInput.files[0];
    if (!originalPhoto) throw new Error('Photo is required');
    const data = new FormData(form);
    const photo = await buildWatermarkedPhoto(originalPhoto);
    data.set('latitude', coords.latitude);
    data.set('longitude', coords.longitude);
    data.set('photo', photo);
    const res = await fetch('/submit', { method: 'POST', body: data });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || 'Submit failed');
    form.reset();
    coords = { latitude: '', longitude: '' };
    gps.textContent = 'GPS: waiting';
    getGps();
    setMsg(json.warning ? `Saved with warning: ${json.warning}` : 'Saved successfully', false);
  } catch (error) {
    setMsg(error.message, true);
  } finally {
    submitBtn.disabled = false;
  }
});

getGps();
