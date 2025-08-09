require('dotenv').config();
const express = require('express');
const cors = require('cors'); // Importing cors
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const path = require('path');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const app = express();
app.use(express.json());
app.use(cors()); // Enable CORS for all routes

// Configuración de la base de datos
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Funciones auxiliares
async function findUserByEmail(email) {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0];
}
async function findUserById(id) {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0];
}

function verifyPassword(inputPassword, storedPassword) {
  return bcrypt.compareSync(inputPassword, storedPassword);
}

function generateSessionToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function saveUserSecret(userId, secret) {
  await pool.query('UPDATE users SET two_factor_secret = $1 WHERE id = $2', [secret, userId]);
}

async function getUserSecret(userId) {
  const result = await pool.query('SELECT two_factor_secret FROM users WHERE id = $1', [userId]);
  return result.rows[0]?.two_factor_secret;
}

// Rutas para servir archivos HTML
app.use(express.static(path.join(__dirname)));

// Ruta para registrar un nuevo usuario
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    // Cifra la contraseña y guarda el usuario en la base de datos
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING *',
      [username, email, hashedPassword]
    );

    const userId = result.rows[0].id;

    // Genera el secreto 2FA y guarda el secreto en la base de datos para este usuario
    const secret = speakeasy.generateSecret({ name: "Social Hub Manager" });
    await saveUserSecret(userId, secret.base32);

    // Genera el código QR
    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    // Envía el código QR al frontend
    res.status(201).json({
      message: 'Usuario registrado exitosamente. Escanea el código QR para habilitar 2FA.',
      qrCodeUrl
    });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});