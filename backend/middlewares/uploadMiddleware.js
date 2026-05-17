const multer = require('multer');
const path = require('path');

// Set storage engine
const uploadDir = process.env.VERCEL ? '/tmp/uploads' : 'uploads/';
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
  }
});

// Check File Type
function checkFileType(file, cb) {
  const filetypes = /jpeg|jpg|png|pdf/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images and PDFs Only!');
  }
}

const upload = multer({
  storage: storage,
  limits: { fileSize: 10000000 }, // 10MB limit
  fileFilter: function(_req, file, cb) {
    checkFileType(file, cb);
  }
});

module.exports = upload;
