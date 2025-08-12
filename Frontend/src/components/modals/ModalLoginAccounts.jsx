import React from 'react';
import '../../styles/ModalLoginAccounts.css';
import { redirectToMastodonAuth } from '../../utils/mastodonApi'; // Mantén esta función bien implementada

const ModalLoginAccounts = ({ onClose }) => {
    const handleLogin = () => {
        redirectToMastodonAuth(); // Redirige al flujo de autenticación de Mastodon
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <h2>Inicia sesión con Mastodon</h2>
                <p>Serás redirigido a la página de autorización de Mastodon.</p>
                <button className="login-button" onClick={handleLogin}>
                    Inicia sesión con Mastodon
                </button>
                <button className="close-button" onClick={onClose}>
                    Cerrar
                </button>
            </div>
        </div>
    );
};

export default ModalLoginAccounts;
