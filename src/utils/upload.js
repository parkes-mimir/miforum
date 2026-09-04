const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { UPLOADS_DIR } = require('./helpers');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const allowedExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];

function createStorage(prefix) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      cb(null, prefix + date + '-' + Date.now() + ext);
    }
  });
}

function createFileFilter() {
  return (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    allowedExts.includes(ext) ? cb(null, true) : cb(new Error('仅支持 JPG/PNG/GIF/WebP/BMP 格式图片'));
  };
}

function multerUpload(middleware) {
  return (req, res, next) => {
    middleware(req, res, (err) => {
      if (err && err.code === 'LIMIT_UNEXPECTED_FILE') return next();
      if (err) return res.status(400).json({ error: err.message });
      next();
    });
  };
}

const postUpload = multer({
  storage: createStorage('webforum'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: createFileFilter()
});

const commentUpload = multer({
  storage: createStorage('comment'),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: createFileFilter()
});

const avatarUpload = multer({
  storage: createStorage('avatar'),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: createFileFilter()
});

module.exports = { postUpload, commentUpload, avatarUpload, multerUpload };
