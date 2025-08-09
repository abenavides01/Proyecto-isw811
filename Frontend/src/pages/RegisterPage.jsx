import React, { useState } from "react";
import { Link } from "react-router-dom";
import QRCodeDisplay from "../components/QRCodeDisplay";
import ModalMessage from "../components/modals/ModalMessage"; // Importa el componente modal

const RegisterPage = () => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [modalMessage, setModalMessage] = useState("");
  const [showModal, setShowModal] = useState(false);

  const showModalWithTimeout = (message) => {
    setModalMessage(message);
    setShowModal(true);
    setTimeout(() => setShowModal(false), 2000); // Cierra el modal después de 2 segundos
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });
      const result = await response.json();

      if (response.ok) {
        setQrCodeUrl(result.qrCodeUrl); // Guardar URL del QR
        showModalWithTimeout("Registro exitoso. Configura tu 2FA con el QR."); // Mostrar mensaje de éxito
      } else {
        showModalWithTimeout(result.error || "Error al registrar el usuario"); // Mostrar error en el modal
      }
    } catch (error) {
      console.error("Error al registrar:", error);
      showModalWithTimeout("Ocurrió un error. Por favor intenta nuevamente.");
    }
  };

  return (
    <div>
      <form onSubmit={handleRegister}>
        <h2>Registrarse</h2>
        <input
          type="text"
          placeholder="Nombre de Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          required
        />
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
        <button type="submit">Registrarse</button>

        <p>
          ¿Ya tienes una cuenta? <Link to="/">Inicia sesión aquí</Link>
        </p>

      </form>

      {/* Mostrar el componente QRCodeDisplay si hay un QR disponible */}
      {qrCodeUrl && <QRCodeDisplay qrCodeUrl={qrCodeUrl} />}


      {showModal && (
        <ModalMessage
          message={modalMessage}
          onClose={() => setShowModal(false)} // Permitir cerrar manualmente
        />
      )}
    </div>
  );
};

export default RegisterPage;