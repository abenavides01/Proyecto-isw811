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

app.post('/api/schedules', async (req, res) => {
  const { userId, dayOfWeek, time } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'El ID del usuario es obligatorio' });
  }

  try {
    const userExists = await pool.query('SELECT 1 FROM users WHERE id = $1', [userId]);

    if (userExists.rowCount === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const result = await pool.query(
      'INSERT INTO schedules (user_id, day_of_week, time) VALUES ($1, $2, $3) RETURNING *',
      [userId, dayOfWeek, time]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error al crear horario:', error);
    res.status(500).json({ error: 'Error al crear horario' });
  }
});


app.put('/api/schedules/:id', async (req, res) => {
  const { id } = req.params;
  const { dayOfWeek, time } = req.body;
  try {
    const result = await pool.query(
      'UPDATE schedules SET day_of_week = $1, time = $2 WHERE id = $3 RETURNING *',
      [dayOfWeek, time, id]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error al actualizar horario:', error);
    res.status(500).json({ error: 'Error al actualizar horario.' });
  }
});

app.delete('/api/schedules/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM schedules WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error al eliminar horario:', error);
    res.status(500).json({ error: 'Error al eliminar horario.' });
  }
});

app.post('/api/queue-posts', async (req, res) => {
  const { userId, socialNetwork, title, content } = req.body;

  if (!userId || !socialNetwork || !title || !content) {
      return res.status(400).json({ error: 'Faltan datos obligatorios' });
  }

  try {
      console.log('Datos recibidos:', { userId, socialNetwork, title, content });

      const dayMap = ['D', 'L', 'K', 'M', 'J', 'V', 'S']; // Ajustado a tus valores
      const now = new Date();
      const currentDayAbbr = dayMap[now.getDay()];
      const currentTime = now.toTimeString().split(' ')[0]; // Hora actual en formato HH:mm:ss

      const nextSchedule = await pool.query(
          `
          SELECT s.day_of_week, s.time
          FROM schedules s
          WHERE s.user_id = $1
          AND (
              -- Horarios del día actual que aún no han pasado
              (s.day_of_week = $2 AND s.time::TIME > $3)
              OR
              -- Horarios de días futuros
              (ARRAY_POSITION(ARRAY['L', 'K', 'M', 'J', 'V', 'S', 'D'], s.day_of_week) > ARRAY_POSITION(ARRAY['L', 'K', 'M', 'J', 'V', 'S', 'D'], $2))
          )
          ORDER BY
              CASE
                  WHEN s.day_of_week = $2 THEN 0 -- Prioriza horarios del día actual
                  ELSE 1 -- Después, días futuros
              END,
              ARRAY_POSITION(ARRAY['L', 'K', 'M', 'J', 'V', 'S', 'D'], s.day_of_week),
              s.time::TIME
          LIMIT 1
          `,
          [userId, currentDayAbbr, currentTime]
      );

      if (nextSchedule.rowCount === 0) {
          console.log('No hay horarios disponibles');
          return res.status(404).json({ error: 'No hay horarios disponibles para este usuario.' });
      }

      const { day_of_week, time } = nextSchedule.rows[0];
      const nextDate = new Date();
      const [hour, minute] = time.split(':').map(Number);
      nextDate.setHours(hour, minute, 0, 0);
      const currentDayIndex = dayMap.indexOf(currentDayAbbr);
      const scheduleDayIndex = dayMap.indexOf(day_of_week);

      if (scheduleDayIndex !== currentDayIndex || nextDate <= now) {
          const daysToAdd = (7 + scheduleDayIndex - currentDayIndex) % 7;
          nextDate.setDate(nextDate.getDate() + daysToAdd);
      }

      const result = await pool.query(
          `
          INSERT INTO queue_posts (user_id, social_network, title, content, scheduled_time)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING *
          `,
          [userId, socialNetwork, title, content, nextDate]
      );

      console.log('Post agregado:', result.rows[0]);
      res.status(201).json(result.rows[0]);
  } catch (error) {
      console.error('Error al agregar post a la cola:', error);
      res.status(500).json({ error: 'Error al agregar post a la cola' });
  }
});

const processQueuePosts = async () => {
  try {
    const now = new Date();

    // Obtener publicaciones en cola con tiempo programado <= ahora y que no estén en estado "publicado"
    const postsToPublish = await pool.query(
      `SELECT * FROM queue_posts 
       WHERE status = 'en cola' AND scheduled_time <= $1 
       ORDER BY scheduled_time ASC`,
      [now]
    );

    for (const post of postsToPublish.rows) {
      try {
        // Obtener el token del usuario desde la base de datos
        const userTokenResult = await pool.query(
          `SELECT token FROM mastodon_tokens WHERE user_id = $1`,
          [post.user_id]
        );

        if (userTokenResult.rowCount === 0) {
          console.error(`No se encontró un token para el usuario ${post.user_id}`);
          continue;
        }

        const userToken = userTokenResult.rows[0].token;

        // Publicar en Mastodon utilizando el token
        const response = await fetch(`${process.env.MASTODON_API_URL}/api/v1/statuses`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${userToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: `${post.title}\n\n${post.content}`, // Combina título y contenido en un solo estado
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          console.error(`Error al publicar en Mastodon para el post ${post.id}:`, error);
          continue;
        }

        console.log(`Post publicado en Mastodon: ${post.title}`);

        // Actualizar estado a "publicado"
        await pool.query(
          `UPDATE queue_posts SET status = 'publicado', published_at = NOW() 
           WHERE id = $1`,
          [post.id]
        );
      } catch (error) {
        console.error(`Error al procesar el post ${post.id}:`, error);
      }
    }
  } catch (error) {
    console.error('Error al procesar la cola de publicaciones:', error);
  }
};

// Ejecutar el procesamiento cada minuto
setInterval(processQueuePosts, 60000);

app.get('/api/queue-posts/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!userId) {
      return res.status(400).json({ error: 'El ID del usuario es obligatorio' });
  }

  try {
      // Obtener publicaciones pendientes (estado "en cola")
      const pendingPosts = await pool.query(
          `SELECT id, title, content, scheduled_time, social_network FROM queue_posts
           WHERE user_id = $1 AND status = 'en cola'
           ORDER BY scheduled_time ASC`,
          [userId]
      );

      // Obtener publicaciones publicadas (estado "publicado")
      const publishedPosts = await pool.query(
          `SELECT id, title, content, published_at, social_network FROM queue_posts
           WHERE user_id = $1 AND status = 'publicado'
           ORDER BY published_at DESC`,
          [userId]
      );

      res.json({
          pending: pendingPosts.rows,
          published: publishedPosts.rows,
      });
  } catch (error) {
      console.error('Error al obtener publicaciones:', error);
      res.status(500).json({ error: 'Error al obtener publicaciones.' });
  }
});

app.post('/mastodon/post', async (req, res) => {
  const { title, content, token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token de autenticación requerido' });
  }

  try {
    const response = await fetch(`${process.env.MASTODON_API_URL}/api/v1/statuses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status: `${title}\n\n${content}`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al publicar en Mastodon');
    }

    const data = await response.json();
    res.status(200).json({ message: 'Publicado en Mastodon con éxito', data });
  } catch (error) {
    console.error('Error al publicar en Mastodon:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/mastodon/token', async (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Código de autorización requerido' });
  }

  try {
    const response = await fetch(`${process.env.MASTODON_API_URL}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: process.env.MASTODON_CLIENT_ID,
        client_secret: process.env.MASTODON_CLIENT_SECRET,
        redirect_uri: process.env.MASTODON_REDIRECT_URI,
        grant_type: 'authorization_code',
        code,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Error al obtener el token');
    }

    const data = await response.json();
    res.status(200).json({ message: 'Token obtenido con éxito', token: data.access_token });
  } catch (error) {
    console.error('Error al obtener el token:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/mastodon/save-token', async (req, res) => {
  const { userId, token } = req.body;

  if (!userId || !token) {
    return res.status(400).json({ error: 'Faltan datos obligatorios: userId o token' });
  }

  try {
    // Verificar si el token ya existe para el usuario
    const existingToken = await pool.query(
      'SELECT * FROM mastodon_tokens WHERE user_id = $1',
      [userId]
    );

    if (existingToken.rowCount > 0) {
      // Actualizar el token si ya existe
      await pool.query(
        'UPDATE mastodon_tokens SET token = $1, created_at = NOW() WHERE user_id = $2',
        [token, userId]
      );
      return res.status(200).json({ message: 'Token actualizado exitosamente' });
    }

    // Insertar el token si no existe
    await pool.query(
      'INSERT INTO mastodon_tokens (user_id, token) VALUES ($1, $2)',
      [userId, token]
    );

    res.status(201).json({ message: 'Token almacenado exitosamente' });
  } catch (error) {
    console.error('Error al guardar el token:', error);
    res.status(500).json({ error: 'Error al guardar el token' });
  }
});

// Configuración del servidor
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});