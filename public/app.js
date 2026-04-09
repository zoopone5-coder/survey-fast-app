const form = document.getElementById('surveyForm');
const msg = document.getElementById('msg');
const gps = document.getElementById('gps');
const submitBtn = document.getElementById('submitBtn');
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

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  submitBtn.disabled = true;
  setMsg('Submitting...', false);
  try {
    const data = new FormData(form);
    data.set('latitude', coords.latitude);
    data.set('longitude', coords.longitude);
    const res = await fetch('/submit', { method: 'POST', body: data });
    const json = await res.json();
    if (!res.ok || !json.ok) throw new Error(json.error || 'Submit failed');
    form.reset();
    coords = { latitude: '', longitude: '' };
    gps.textContent = 'GPS: waiting';
    getGps();
    setMsg('Saved successfully', false);
  } catch (error) {
    setMsg(error.message, true);
  } finally {
    submitBtn.disabled = false;
  }
});

getGps();
