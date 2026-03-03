const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(cors());
app.use(express.json());

const db = new sqlite3.Database("./journal.db");

function addColumnIfNotExists(table, columnDef) {
  const colName = columnDef.split(" ")[0];
  db.run(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`, (err) => {
    if (err && !String(err.message).includes("duplicate column name")) {
      console.log("ALTER error:", err.message);
    }
  });
}

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS trades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT,
      direction TEXT,
      lot REAL,
      entry REAL,
      exit REAL,
      pnl REAL,
      date TEXT,
      notes TEXT,
      screenshot TEXT
    )
  `);
});

app.post("/trades", (req, res) => {
  const { symbol, direction, lot, entry, exit, date, notes, screenshot } =
    req.body;

  const pnl =
    direction === "LONG" ? (exit - entry) * lot : (entry - exit) * lot;

  db.run(
    `INSERT INTO trades (symbol, direction, lot, entry, exit, pnl, date, notes, screenshot)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      symbol,
      direction,
      lot,
      entry,
      exit,
      pnl,
      date,
      notes || "",
      screenshot || "",
    ],
    function (err) {
      if (err) return res.status(500).send(err);
      res.send({ id: this.lastID });
    }
  );
});

app.get("/trades", (req, res) => {
  db.all("SELECT * FROM trades ORDER BY date DESC, id DESC", [], (err, rows) => {
    if (err) return res.status(500).send(err);
    res.send(rows);
  });
});

app.delete("/trades/:id", (req, res) => {
  const id = Number(req.params.id);
  db.run("DELETE FROM trades WHERE id = ?", [id], function (err) {
    if (err) return res.status(500).send(err);
    res.send({ deleted: this.changes });
  });
});

app.listen(5000, () => {
  console.log("Server 5000 portta çalışıyor");
});