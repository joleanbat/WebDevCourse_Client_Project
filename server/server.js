const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// ===== Middleware =====
app.use(cors());
app.use(express.json());

// ===== Serve your client HTML files (fix Cannot GET /) =====
// your HTML files are one level above "server" folder
const clientDir = path.join(__dirname, "..");
app.use(express.static(clientDir));

app.get("/", (req, res) => {
    res.sendFile(path.join(clientDir, "index.html"));
});

// ===== JSON DB paths =====
const dataDir = path.join(__dirname, "data");
const usersPath = path.join(dataDir, "users.json");
const playlistsPath = path.join(dataDir, "playlists.json");

// ===== Helpers =====
function ensureFiles() {
    if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
    if (!fs.existsSync(usersPath)) fs.writeFileSync(usersPath, "[]", "utf8");
    if (!fs.existsSync(playlistsPath)) fs.writeFileSync(playlistsPath, "[]", "utf8");
}

function readJSON(filePath) {
    try {
        return JSON.parse(fs.readFileSync(filePath, "utf8") || "[]");
    } catch (e) {
        return [];
    }
}

function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

ensureFiles();

// ===== API =====

// REGISTER
app.post("/api/register", (req, res) => {
    const { username, firstName, imageUrl, password, confirmPassword } = req.body || {};

    if (!username || !firstName || !imageUrl || !password || !confirmPassword) {
        return res.status(400).json({ ok: false, message: "חסרים שדות" });
    }

    // password rules
    if (password.length < 6) {
        return res.status(400).json({ ok: false, message: "הסיסמה חייבת להכיל לפחות 6 תווים" });
    }
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    if (!hasLetter || !hasNumber) {
        return res.status(400).json({ ok: false, message: "הסיסמה חייבת להכיל לפחות אות אחת ומספר אחד" });
    }
    if (password !== confirmPassword) {
        return res.status(400).json({ ok: false, message: "הסיסמאות אינן זהות" });
    }

    const users = readJSON(usersPath);
    const exists = users.some(u => u.username === username);
    if (exists) {
        return res.status(409).json({ ok: false, message: "שם המשתמש כבר קיים במערכת" });
    }

    const newUser = { username, firstName, imageUrl, password };
    users.push(newUser);
    writeJSON(usersPath, users);

    return res.json({ ok: true, message: "נרשמת בהצלחה" });
});

// LOGIN
app.post("/api/login", (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
        return res.status(400).json({ ok: false, message: "חסרים שדות" });
    }

    const users = readJSON(usersPath);
    const user = users.find(u => u.username === username && u.password === password);
    if (!user) {
        return res.status(401).json({ ok: false, message: "שם משתמש או סיסמה שגויים" });
    }

    // return only what client needs (no password)
    return res.json({
        ok: true,
        user: {
            username: user.username,
            firstName: user.firstName,
            imageUrl: user.imageUrl
        }
    });
});

// quick test
app.get("/api/health", (req, res) => {
    res.json({ ok: true, message: "API is running" });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});