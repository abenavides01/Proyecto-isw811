import React, { useState } from 'react';

const CreatePostInQueue = ({ selectedSocialMedia, onReset }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedSocialMedia) {
            alert('Por favor seleccione una red social válida.');
            return;
        }

        try {
            const response = await fetch('/api/queue-posts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId: sessionStorage.getItem('userId'),
                    socialNetwork: selectedSocialMedia,
                    title,
                    content,
                }),
            });

            if (!response.ok) {
                throw new Error('Error al agregar la publicación a la cola');
            }

            const data = await response.json();
            console.log('Post agregado a la cola:', data);

            // Limpiar el estado interno del formulario
            setTitle('');
            setContent('');

            // Llamar al método de reinicio del padre
            onReset();

            alert('Publicación agregada a la cola con éxito.');
        } catch (error) {
            console.error('Error al enviar post:', error);
            alert('Error al agregar la publicación a la cola.');
        }
    };

    return (
        <div className="post-container">
            <h2 className="post-header">Agregar Post a la Cola</h2>
            <form onSubmit={handleSubmit} className="post-form">
                <div className="post-group">
                    <label htmlFor="title" className="post-label">Título:</label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="post-input"
                        placeholder="Escribe el título aquí"
                        required
                    />
                </div>
                <div className="post-group">
                    <label htmlFor="content" className="post-label">Contenido:</label>
                    <textarea
                        id="content"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="post-textarea"
                        placeholder="Escribe el contenido aquí"
                        required
                    />
                </div>
                <button type="submit" className="post-button">Agregar a Cola</button>
            </form>
        </div>
    );
};

export default CreatePostInQueue;
