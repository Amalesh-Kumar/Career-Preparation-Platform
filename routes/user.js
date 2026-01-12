const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const sqlite3 = require('sqlite3').verbose();
const dbFile = process.env.SQLITE_FILE || './data/db.sqlite';

router.get('/', auth, (req, res) => {
  const db = new sqlite3.Database(dbFile);
  db.get('SELECT id,name,email,createdAt FROM users WHERE id = ?', [req.user.id], (err, row) => {
    if (err) { console.error(err); return res.status(500).json({ error: 'Internal' }); }
    res.json({ user: row });
    db.close();
  });
});

module.exports = router;
