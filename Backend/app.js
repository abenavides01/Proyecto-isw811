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

// Ruta para iniciar sesión
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await findUserByEmail(email);

  if (!user || !verifyPassword(password, user.password)) {
    return res.status(401).json({ error: 'Credenciales incorrectas' });
  }

  if (!user.two_factor_secret) {
    const secret = speakeasy.generateSecret({ name: "Social Hub Manager" });
    await saveUserSecret(user.id, secret.base32);

    const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

    return res.json({
      require2FA: true,
      message: 'Configura 2FA escaneando el código QR.',
      qrCodeUrl,
    });
  }

  res.json({
    require2FA: true,
    message: 'Ingresa tu código OTP.',
    userId: user.id,
    username: user.username,
  });
});


app.get('/username', async (req, res) => {
  const { userId } = req.query; // Recibe el userId como parámetro de la consulta

  if (!userId) {
    return res.status(400).json({ error: 'Falta el userId' });
  }

  try {
    const user = await findUserById(userId); // Busca al usuario en la base de datos

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ username: user.username });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Ruta para verificar el OTP después de iniciar sesión
app.post('/login/verify-otp', async (req, res) => {
  const { userId, token } = req.body;

  try {
    const userSecret = await getUserSecret(userId);

    if (!userSecret) {
      return res.status(400).json({
        success: false,
        message: 'No se encontró el secreto de 2FA para el usuario',
      });
    }

    const verified = speakeasy.totp.verify({
      secret: userSecret,
      encoding: 'base32',
      token: token,
    });

    if (verified) {
      const sessionToken = generateSessionToken({ id: userId });
      return res.json({
        success: true,
        message: 'Código OTP verificado correctamente.',
        token: sessionToken,
      });
    } else {
      return res.status(400).json({ success: false, message: 'Código OTP incorrecto' });
    }
  } catch (error) {
    console.error('Error al verificar el OTP:', error);
    res.status(500).json({ error: 'Error en la verificación de OTP' });
  }
});


app.get('/api/schedules/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
    return res.status(400).json({ error: 'El ID del usuario es obligatorio' });
  }

  try {
    const userExists = await pool.query('SELECT 1 FROM users WHERE id = $1', [userId]);

    if (userExists.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const result = await pool.query(
      'SELECT s.*, u.username FROM schedules s JOIN users u ON s.user_id = u.id WHERE s.user_id = $1',
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error al obtener horarios:', error);
    res.status(500).json({ error: 'Error al obtener horarios.' });
  }
});


const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});