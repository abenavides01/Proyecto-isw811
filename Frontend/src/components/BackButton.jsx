import React from 'react';
import { useNavigate } from 'react-router-dom';

const BackButton = ({ label = 'Volver', className = '', style = {}, fallbackPath = '/' }) => {
    const navigate = useNavigate();

    const handleClick = () => {
        if (window.history.length > 2) {
            navigate(-1); // Volver a la página anterior
        } else {
            navigate(fallbackPath); // Ir a una ruta de fallback si no hay historial
        }
    };

    return (
        <button
            onClick={handleClick}
            className={`back-button ${className}`}
            style={style}
        >
            {label}
        </button>
    );
};

export default BackButton;
