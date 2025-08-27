import React, { useState } from 'react';
import '../styles/AccountConfigPage.css';
import BackButton from "../components/BackButton";
import Modal from "../components/modals/ModalLoginAccounts"; // Importamos el componente Modal

const AccountConfigPage = () => {
    const [isModalOpen, setIsModalOpen] = useState(false); // Estado para el modal

    // Función para manejar el cambio del checkbox
    const handleCheckboxChange = () => {
        setIsModalOpen(true); // Abre el modal al marcar el checkbox
    };

    // Función para cerrar el modal
    const closeModal = () => {
        setIsModalOpen(false);
    };

    return (
        <div>
            <div className="container-back-button">
                <BackButton 
                    label="Regresar" 
                    className="custom-back-btn" 
                    fallbackPath="/home"
                />
            </div>
            <h1>Configuración de cuentas</h1>
            <div className="grid-divs-container">
                <div className="grid-div">
                    <img src="/images/mastodon.ico" alt="Mastodon" className="div-icon" />
                    Mastodon
                    <label className="switch">
                        <input type="checkbox" onChange={handleCheckboxChange} />
                        <span className="slider"></span>
                    </label>
                </div>
                <div className="grid-div">
                    <img src="/images/linkedin.ico" alt="Linkedin" className="div-icon" />
                    Linkedin
                    <label className="switch">
                        <input type="checkbox" onChange={handleCheckboxChange} />
                        <span className="slider"></span>
                    </label>
                </div>
            </div>
            {/* Renderiza el modal si está abierto */}
            {isModalOpen && <Modal onClose={closeModal} />}
        </div>
    );
};

export default AccountConfigPage;