import React, { useState } from 'react';
import ModalMessage from "../components/modals/ModalMessage";

const OTPVerification = () => {
  const [otpCode, setOtpCode] = useState('');
  const [modalMessage, setModalMessage] = useState("");
  const [showModal, setShowModal] = useState(false);

  const showModalWithTimeout = (message) => {
    setModalMessage(message);
    setShowModal(true);
    setTimeout(() => setShowModal(false), 4000); // Se cierra el modal después de 2 segundos
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    const userId = localStorage.getItem('userId');
    if (!userId) {
      alert('Error: Usuario no autenticado');
      return;
    }
    try {
      const response = await fetch('/login/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: otpCode }),
      });
      const result = await response.json();
      if (result.success) {
        showModalWithTimeout(result.message);
        localStorage.setItem('token', result.token);
        window.location.href = '/home';
      } else {
        alert(result.message || 'Error al verificar el OTP');
      }
    } catch (error) {
      console.error('Error al verificar el OTP:', error);
    }
  };

  return (
    <form onSubmit={handleVerify}>
      <h2>Verifica el OTP</h2>
      <input
        type="text"
        placeholder="Código OTP"
        value={otpCode}
        onChange={(e) => setOtpCode(e.target.value)}
        required
      />
      <button type="submit">Verificar</button>

      {showModal && (
        <ModalMessage
          message={modalMessage}
          onClose={() => setShowModal(false)} 
        />
      )}
    </form>

  );
};

export default OTPVerification;
