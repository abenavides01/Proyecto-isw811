const BASE = process.env.REACT_APP_API_URL || ''; // si usas proxy ":3005", deja vacío

async function asJson(res) {
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Inicia el flujo OAuth sin exponer code/URL en el frontend */
export function startLinkedIn(userId) {
  if (!userId) throw new Error('Falta userId');
  // el backend redirige a LinkedIn y después vuelve al frontend
  window.location.href = `${BASE}/api/linkedin/start?userId=${encodeURIComponent(userId)}`;
}

/** Estado de conexión (¿ya hay token guardado?) */
export function getLinkedInStatus(userId) {
  return fetch(`${BASE}/api/linkedin/status?userId=${encodeURIComponent(userId)}`).then(asJson);
}

/** Publicar directamente en LinkedIn (sin pasar por la cola) */
export function postToLinkedIn({ userId, text, link }) {
  return fetch(`${BASE}/api/linkedin/post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, text, link }),
  }).then(asJson);
}

/** Encolar un post para LinkedIn (lo publicará tu worker) */
export function queueLinkedInPost({ userId, title, content }) {
  return fetch(`${BASE}/api/queue-posts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      socialNetwork: 'linkedin',
      title,
      content,
    }),
  }).then(asJson);
}

/** Leer pendientes/publicados del usuario (para UI) */
export function getQueuePosts(userId) {
  return fetch(`${BASE}/api/queue-posts/${encodeURIComponent(userId)}`).then(asJson);
}
