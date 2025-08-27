const API_BASE = process.env.REACT_APP_API_BASE || 'http://localhost:3005'; 

async function asJson(res) {
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

/** Inicia el flujo OAuth sin exponer code/URL en el frontend */
export function startLinkedIn(userId) {
  const url = `${API_BASE}/api/linkedin/start?userId=${encodeURIComponent(userId)}`;
  window.location.assign(url);
}

/** Estado de conexión (¿ya hay token guardado?) */
export function getLinkedInStatus(userId) {
  return fetch(`${API_BASE}/api/linkedin/status?userId=${encodeURIComponent(userId)}`).then(asJson);
}

/** Publicar directamente en LinkedIn (sin pasar por la cola) */
export function postToLinkedIn({ userId, text, link }) {
  return fetch(`${API_BASE}/api/linkedin/post`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, text, link }),
  }).then(asJson);
}

/** Encolar un post para LinkedIn (lo publicará tu worker) */
export function queueLinkedInPost({ userId, title, content }) {
  return fetch(`${API_BASE}/api/queue-posts`, {
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
  return fetch(`${API_BASE}/api/queue-posts/${encodeURIComponent(userId)}`).then(asJson);
}
