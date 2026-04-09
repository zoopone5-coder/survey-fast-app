const assert = require('node:assert/strict');

process.env.NODE_ENV = 'test';
global.__mockGoogle = {
  appendToSheet: async (row) => { global.__row = row; }
};

const app = require('../server');

(async () => {
  const server = app.listen(0);
  try {
    const port = server.address().port;
    const boundary = '----surveytest';
    const body = [
      `--${boundary}\r\nContent-Disposition: form-data; name="siteName"\r\n\r\nSITE-1\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="pincode"\r\n\r\n362001\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="latitude"\r\n\r\n21.52\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="longitude"\r\n\r\n70.45\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="photoName"\r\n\r\nSITE-1-171.jpg\r\n`,
      `--${boundary}\r\nContent-Disposition: form-data; name="answers"\r\n\r\n{"q1":"yes"}\r\n`,
      `--${boundary}--\r\n`
    ].join('');
    const res = await fetch(`http://127.0.0.1:${port}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` },
      body
    });
    assert.equal(res.status, 200);
    assert.equal(global.__row[1], 'SITE-1');
    assert.equal(global.__row[8], '362001');
    assert.equal(global.__row[9], '21.52');
    assert.equal(global.__row[10], '70.45');
    assert.equal(global.__row[11], 'SITE-1-171.jpg');
    assert.equal(global.__row[12], '{"q1":"yes"}');
    console.log('basic test passed');
  } finally {
    server.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
