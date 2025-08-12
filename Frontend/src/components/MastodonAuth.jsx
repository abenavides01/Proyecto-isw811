import React, { useEffect } from 'react';

const MastodonAuth = () => {
    useEffect(() => {
        const handleAuth = async () => {
            const params = new URLSearchParams(window.location.search);
            const code = params.get('code'); // Captura el código de autorización

            if (!code) {
                console.error('No se encontró el código de autorización.');
                return;
            }

            try {
                // Llama al backend para intercambiar el código por un token
                const response = await fetch('http://localhost:3000/mastodon/token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ code }), // Envía el código al backend
                });

                if (!response.ok) {
                    throw new Error('Error al obtener el token desde el backend');
                }

                const data = await response.json();
                const token = data.token;

                // Guardar el token en sessionStorage
                sessionStorage.setItem('mastodonToken', token);

                const userId = localStorage.getItem('userId'); // Obtén el userId desde localStorage
                if (!userId) {
                    console.error('No se encontró el userId en localStorage.');
                    return;
                }

                // Llama al backend para guardar el token en la base de datos
                const saveResponse = await fetch('http://localhost:3000/mastodon/save-token', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ userId, token }), // Envía userId y token al backend
                });

                if (!saveResponse.ok) {
                    throw new Error('Error al guardar el token en la base de datos');
                }

                console.log('Token almacenado exitosamente en la base de datos y en sessionStorage.');
                // Redirige al usuario después de la autenticación
                window.location.href = '/home';
            } catch (error) {
                console.error('Error durante la autenticación:', error);
            }
        };

        handleAuth();
    }, []); // Se ejecuta una vez al montar el componente

    return <p>Autenticando con Mastodon...</p>;
};

export default MastodonAuth;
