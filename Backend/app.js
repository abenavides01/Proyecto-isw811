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

    // busca posts en cola que ya deben publicarse
    const postsToPublish = await pool.query(
      `SELECT *
         FROM queue_posts
        WHERE status = 'en cola'
          AND scheduled_time <= $1
        ORDER BY scheduled_time ASC`,
      [now]
    );

    for (const post of postsToPublish.rows) {
      try {
        // Back-compat: si no hay columna/valor, asumimos mastodon
        const network = (post.social_network || 'mastodon').toLowerCase();

        if (network === 'mastodon') {
          const userTokenResult = await pool.query(
            `SELECT token FROM mastodon_tokens WHERE user_id = $1`,
            [post.user_id]
          );

          if (userTokenResult.rowCount === 0) {
            console.error(`No se encontró un token de Mastodon para el usuario ${post.user_id}`);
            continue;
          }

          const userToken = userTokenResult.rows[0].token;

          const response = await fetch(`${process.env.MASTODON_API_URL}/api/v1/statuses`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${userToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              status: `${post.title}\n\n${post.content}`,
            }),
          });

          if (!response.ok) {
            const errText = await response.text().catch(() => '');
            console.error(`Error al publicar en Mastodon para el post ${post.id}:`, errText);
            continue;
          }

          console.log(`Post ${post.id} publicado en Mastodon`);

        } else if (network === 'linkedin') {
          // Obtener access_token más reciente del usuario
          const tok = await pool.query(
            `SELECT access_token
               FROM linkedin_tokens
              WHERE user_id = $1
              ORDER BY created_at DESC
              LIMIT 1`,
            [post.user_id]
          );
          if (tok.rowCount === 0) {
            console.error(`No se encontró token de LinkedIn para el usuario ${post.user_id}`);
            continue;
          }
          const accessToken = tok.rows[0].access_token;

          // Obtener el member id (URN autor)
          const meRes = await fetch('https://api.linkedin.com/v2/me', {
            headers: { Authorization: `Bearer ${accessToken}` },
          });
          if (!meRes.ok) {
            const errText = await meRes.text().catch(() => '');
            console.error('LinkedIn /me error:', errText);
            continue;
          }
          const me = await meRes.json();
          const author = `urn:li:person:${me.id}`;

          // Publicar usando UGC (Share on LinkedIn)
          const liRes = await fetch('https://api.linkedin.com/v2/ugcPosts', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'X-Restli-Protocol-Version': '2.0.0',
            },
            body: JSON.stringify({
              author,
              lifecycleState: 'PUBLISHED',
              specificContent: {
                'com.linkedin.ugc.ShareContent': {
                  shareCommentary: { text: `${post.title}\n\n${post.content}` },
                  shareMediaCategory: 'NONE',
                },
              },
              visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
            }),
          });

          if (!liRes.ok) {
            const errText = await liRes.text().catch(() => '');
            console.error(`Error al publicar en LinkedIn para el post ${post.id}:`, errText);
            continue;
          }

          console.log(`Post ${post.id} publicado en LinkedIn`);
        } else {
          console.warn(`social_network desconocida "${network}" para post ${post.id}`);
          continue;
        }

        // 4) marcar como publicado
        await pool.query(
          `UPDATE queue_posts
              SET status = 'publicado',
                  published_at = NOW()
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

// ======= LINKEDIN ========

const crypto = require('crypto');
const OAUTH_STATE_SECRET = process.env.OAUTH_STATE_SECRET;
const cookieParser = require('cookie-parser');
app.use(cookieParser());  // <-- para leer req.cookies

function signState(payload) {
  // payload: { userId, nonce, ts }
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(data).digest('base64url');
  return `${data}.${sig}`;
}

function verifyState(state) {
  const [data, sig] = state.split('.');
  const expected = crypto.createHmac('sha256', OAUTH_STATE_SECRET).update(data).digest('base64url');
  if (sig !== expected) throw new Error('bad state signature');
  const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  // opcional: caducidad (10 min)
  if (Date.now() - (payload.ts || 0) > 10 * 60 * 1000) throw new Error('state expired');
  return payload; // { userId, nonce, ts }
}

// Crea y guarda un state para LinkedIn
async function createOAuthStateFor(userId) {
  const state = crypto.randomBytes(24).toString('hex');
  await pool.query(
    `INSERT INTO oauth_state (state, user_id, provider, created_at)
     VALUES ($1, $2, 'linkedin', NOW())`,
    [state, userId]
  );
  return state;
}

// Lee y elimina el state (lo “consume”)
// Devuelve el user_id si existía; null si no existe/expiró
async function consumeOAuthState(state) {
  const r = await pool.query(
    `DELETE FROM oauth_state
       WHERE state = $1 AND provider = 'linkedin'
       RETURNING user_id`,
    [state]
  );
  return r.rowCount ? r.rows[0].user_id : null;
}


async function saveLinkedinToken(userId, accessToken, expiresIn, personUrn) {
  const expiresAt = new Date(Date.now() + (expiresIn * 1000));
  await pool.query(`
    INSERT INTO linkedin_tokens (user_id, access_token, person_urn, expires_at, created_at, updated_at)
    VALUES ($1,$2,$3,$4,NOW(),NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET access_token=EXCLUDED.access_token,
                  person_urn   =EXCLUDED.person_urn,
                  expires_at   =EXCLUDED.expires_at,
                  updated_at   =NOW()
  `, [userId, accessToken, personUrn, expiresAt]);
}

async function getLinkedinCreds(userId) {
  const r = await pool.query(`SELECT access_token, person_urn, expires_at FROM linkedin_tokens WHERE user_id=$1`, [userId]);
  return r.rows[0]; // undefined si no existe
}

//redirige a LinkedIn 
app.get('/api/linkedin/start', (req, res) => {
  const { userId } = req.query;
  if (!userId) return res.status(400).send('Falta userId');

  const state = crypto.randomBytes(16).toString('hex');

  // Cookies para validar en el callback
  res.cookie('li_state', state, { httpOnly: true, sameSite: 'lax' });
  res.cookie('li_user', userId, { httpOnly: true, sameSite: 'lax' });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: process.env.LINKEDIN_REDIRECT_URI, // Debe coincidir EXACTO con el portal de LinkedIn
    scope: process.env.LINKEDIN_SCOPE,               // ej: "w_member_social openid email"
    state
  });

  const authUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  console.log('[LinkedIn] AUTH URL =>', authUrl);
  res.redirect(authUrl);
});


// CALLBACK: troca code->token, guarda en BD y redirige al FE
app.get('/linkedin/callback', async (req, res) => {
  try {
    const { code, state, error, error_description } = req.query;

    if (error) {
      console.error('[LinkedIn] callback error:', error, error_description);
      return res.status(400).send(`LinkedIn error: ${error}: ${error_description}`);
    }

    // Validar state con cookie
    const cookieState = req.cookies.li_state;
    const userId = req.cookies.li_user;
    if (!cookieState || state !== cookieState) {
      console.error('[LinkedIn] state inválido', { state, cookieState });
      return res.status(400).send('State inválido');
    }
    if (!userId) {
      console.error('[LinkedIn] Falta cookie li_user');
      return res.status(400).send('Falta userId en cookie');
    }

    // Intercambiar code -> access_token
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.LINKEDIN_REDIRECT_URI,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
    });

    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });

    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      console.error('[LinkedIn] token exchange failed:', tokenRes.status, txt);
      return res.status(500).send(`Fallo al intercambiar token: ${tokenRes.status}\n${txt}`);
    }

    const tokenData = await tokenRes.json();
    console.log('[LinkedIn] tokenData:', tokenData);

    // Guarda el token
    await pool.query(
      `INSERT INTO linkedin_tokens (user_id, access_token, expires_in)
       VALUES ($1, $2, $3)`,
      [userId, tokenData.access_token, tokenData.expires_in ?? null]
    );

    // Limpia cookies
    res.clearCookie('li_state');
    res.clearCookie('li_user');

    // Puedes cerrar y volver al front
    res.send('¡Listo! Conectado con LinkedIn. Ya puedes cerrar esta pestaña.');
  } catch (e) {
    console.error('[LinkedIn] Error en callback:', e);
    res.status(500).send('Error en callback de LinkedIn');
  }
}); 

// Estado de conexión para el frontend 
app.get('/api/linkedin/status', async (req, res) => {
  try {
    const userId = parseInt(req.query.userId, 10);
    if (!userId) return res.status(400).json({ error: 'missing userId' });
    const creds = await getLinkedinCreds(userId);
    res.json({ connected: !!creds, personUrn: creds?.person_urn || null, expiresAt: creds?.expires_at || null });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'status failed' });
  }
});

// Publicar en nombre del usuario logueado
app.post('/api/linkedin/post', async (req, res) => {
  const { userId, text, link } = req.body;
  if (!userId || !text) return res.status(400).json({ error: 'userId y text son obligatorios' });

  try {
    const creds = await getLinkedinCreds(userId);
    if (!creds) return res.status(400).json({ error: 'Usuario no conectado a LinkedIn' });

    // Construir cuerpo del UGC
    const body = {
      author: creds.person_urn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          ...(link
            ? { shareMediaCategory: 'ARTICLE', media: [{ status: 'READY', originalUrl: link, title: { text: 'Enlace' } }] }
            : { shareMediaCategory: 'NONE' })
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    };

    const r = await fetch('https://api.linkedin.com/v2/ugcPosts', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.access_token}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify(body)
    });

    const data = await r.json();
    if (!r.ok) return res.status(r.status).json(data);
    res.status(201).json(data);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error publicando en LinkedIn' });
  }
});


// Configuración del servidor
const PORT = process.env.PORT || 3005;
app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});