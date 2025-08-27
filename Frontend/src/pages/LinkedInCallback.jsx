import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

// Detecta la URL del backend desde env (Vite o CRA) o usa localhost:3005
const API_BASE =
  (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL) ||
  (typeof process !== "undefined" && process.env && process.env.REACT_APP_API_URL) ||
  "http://localhost:3005";

export default function LinkedInCallback() {
  const [status, setStatus] = useState("Procesando autorización de LinkedIn…");
  const [details, setDetails] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const oauthError = params.get("error");
        const oauthErrorDesc = params.get("error_description");
        if (oauthError) {
          throw new Error(oauthErrorDesc || oauthError);
        }

        const code = params.get("code");
        if (!code) {
          throw new Error(
            'No llegó el parámetro "code". Abre el flujo desde el botón "Conectar LinkedIn".'
          );
        }

        // 1) Intercambiar code -> access_token
        setStatus("Intercambiando code por access_token…");
        const tr = await fetch(`${API_BASE}/linkedin/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code }),
        });
        const tokenData = await tr.json();
        if (!tr.ok || !tokenData.access_token) {
          throw new Error(
            tokenData.error_description ||
              tokenData.error ||
              `Fallo en /linkedin/token: ${JSON.stringify(tokenData)}`
          );
        }
        const accessToken = tokenData.access_token;

        // 2) Obtener tu URN (id persona) para confirmar
        setStatus("Leyendo tu perfil (URN) en LinkedIn…");
        const mr = await fetch(
          `${API_BASE}/linkedin/me?token=${encodeURIComponent(accessToken)}`
        );
        const me = await mr.json();
        if (!mr.ok || !me.id) {
          throw new Error(
            me.error || `Fallo en /linkedin/me: ${JSON.stringify(me)}`
          );
        }
        const personUrn = me.personUrn || `urn:li:person:${me.id}`;

        // 3) Obtener userId del usuario logueado en tu app (desde localStorage)
        let userId = null;
        try {
          const candidates = ["user", "currentUser", "userData"];
          for (const key of candidates) {
            const raw = localStorage.getItem(key);
            if (raw) {
              const obj = JSON.parse(raw);
              userId = obj?.id ?? obj?.userId ?? obj?.user?.id ?? null;
              if (userId) break;
            }
          }
        } catch {
          // ignorar errores de parseo
        }

        // 4) Guardar token en tu backend asociado a ese userId (si lo encontramos)
        if (userId) {
          setStatus("Guardando token en tu cuenta de SocialHub…");
          const sr = await fetch(`${API_BASE}/linkedin/save-token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, token: accessToken }),
          });
          if (!sr.ok) {
            const se = await sr.json().catch(() => ({}));
            throw new Error(se.error || "No se pudo guardar el token");
          }
        } else {
          setStatus(
            "Token obtenido. No se guardó porque no encontré tu userId local."
          );
        }

        setDetails({ personUrn });
        setStatus("¡LinkedIn conectado!");
        // Redirige de vuelta a Configuración de cuentas
        setTimeout(() => navigate("/account-config"), 1500);
      } catch (e) {
        console.error(e);
        setError(String(e?.message || e));
        setStatus(null);
      }
    })();
  }, [navigate]);

  return (
    <div style={{ padding: 24 }}>
      <h2>LinkedIn – Callback</h2>
      {status && <p>{status}</p>}

      {details && (
        <pre
          style={{
            background: "#f6f8fa",
            padding: 12,
            borderRadius: 8,
            overflowX: "auto",
          }}
        >
          {JSON.stringify(details, null, 2)}
        </pre>
      )}

      {error && (
        <div style={{ color: "crimson", marginTop: 8 }}>
          <strong>Error:</strong> {error}
          <p>
            Vuelve a <a href="/account-config">Configurar cuentas</a> y prueba
            de nuevo.
          </p>
        </div>
      )}
    </div>
  );
}
