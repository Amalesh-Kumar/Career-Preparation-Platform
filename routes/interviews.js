const express = require('express');
const router = express.Router();
const auth = require('../middlewares/auth');
const sqlite3 = require('sqlite3').verbose();
const dbFile = process.env.SQLITE_FILE || './data/db.sqlite';

function getDb() { return new sqlite3.Database(dbFile); }

// list interviews (for user)
router.get('/', auth, (req, res) => {
  const db = getDb();
  db.all('SELECT * FROM interviews WHERE candidateId = ? OR interviewerId = ?', [req.user.id, req.user.id], (err, rows) => {
    if (err) { console.error(err); return res.status(500).json({ error: 'Internal' }); }
    res.json({ interviews: rows });
    db.close();
  });
});

// create
router.post('/', auth, (req, res) => {
  const { title, candidateId, interviewerId, questions } = req.body;
  const db = getDb();
  const stmt = db.prepare('INSERT INTO interviews (title,candidateId,interviewerId,questions,createdAt) VALUES (?,?,?,?,?)');
  const createdAt = Date.now();
  stmt.run(title||'', candidateId||req.user.id, interviewerId||null, JSON.stringify(questions||[]), createdAt, function(err) {
    if (err) { console.error(err); return res.status(500).json({ error: 'Internal' }); }
    res.json({ id: this.lastID });
    db.close();
  });
});

// get by id
router.get('/:id', auth, (req, res) => {
  const db = getDb();
  db.get('SELECT * FROM interviews WHERE id = ?', [req.params.id], (err, row) => {
    if (err) { console.error(err); return res.status(500).json({ error: 'Internal' }); }
    if (!row) return res.status(404).json({ error: 'Not found' });
    row.questions = JSON.parse(row.questions || '[]');
    res.json({ interview: row });
    db.close();
  });
});

// update
router.put('/:id', auth, (req, res) => {
  const { title, questions, score, feedback } = req.body;
  const db = getDb();
  db.run('UPDATE interviews SET title = ?, questions = ?, score = ?, feedback = ? WHERE id = ?', [title, JSON.stringify(questions||[]), score||null, feedback||'', req.params.id], function(err) {
    if (err) { console.error(err); return res.status(500).json({ error: 'Internal' }); }
    res.json({ changes: this.changes });
    db.close();
  });
});

// delete
router.delete('/:id', auth, (req, res) => {
  const db = getDb();
  db.run('DELETE FROM interviews WHERE id = ?', [req.params.id], function(err) {
    if (err) { console.error(err); return res.status(500).json({ error: 'Internal' }); }
    res.json({ changes: this.changes });
    db.close();
  });
});

module.exports = router;
