const multer = require('multer');

module.exports = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: Number(process.env.MAX_PHOTO_BYTES || 8 * 1024 * 1024) }
});
