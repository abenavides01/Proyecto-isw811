import React, { useState } from "react";
import { Link } from "react-router-dom";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const result = await response.json();

      if (response.ok && result.require2FA) {
        if (result.qrCodeUrl) {
          alert("Configura 2FA escaneando el código QR");
        } else {
          localStorage.setItem("userId", result.userId);
          sessionStorage.setItem("userId", result.userId);
          await fetchUsername(result.userId); // Llama a la función para guardar el username
          window.location.href = "/verify-otp";
        }
      } else {
        alert(result.error || "Error al iniciar sesión");
      }
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
    }
  };

  const fetchUsername = async (userId) => {
    try {
      const response = await fetch(`/username?userId=${userId}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
  
      if (response.ok) {
        const result = await response.json();
        sessionStorage.setItem("username", result.username); // Guarda el username en localStorage
      } else {
        console.error("Error al obtener el username");
      }
    } catch (error) {
      console.error("Error al obtener el username:", error);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <h2>Iniciar Sesión</h2>
      <input
        type="email"
        placeholder="Correo Electrónico"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <input
        type="password"
        placeholder="Contraseña"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      <button type="submit">Iniciar Sesión</button>
      <p>
        ¿No tienes una cuenta? <Link to="/register">Regístrate aquí</Link>
      </p>
    </form>
  );
};

export default LoginPage;