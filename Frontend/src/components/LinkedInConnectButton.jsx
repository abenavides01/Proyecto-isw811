import React from 'react';
import { startLinkedIn } from '../utils/linkedInApi';

export default function LinkedInConnectButton() {
  const userId = JSON.parse(localStorage.getItem('userId'));

  const handleConnect = () => {
    if (!userId) {
      alert('Falta userId (inicia sesión primero)');
      return;
    }
    // Esto hace window.location.href = /api/linkedin/start?userId=...
    startLinkedIn(userId);
  };

  return (
    <button onClick={handleConnect}>
      Conectar LinkedIn
    </button>
  );
}
