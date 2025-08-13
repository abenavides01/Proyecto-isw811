import React, { useState, useEffect } from 'react';
import '../styles/CreatePost.css';

const CreateScheduledPost = ({ onReset }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [schedules, setSchedules] = useState([]);
    const [selectedSchedule, setSelectedSchedule] = useState(null);

    // Cargar horarios desde la API
    useEffect(() => {
        const fetchSchedules = async () => {
            const userId = sessionStorage.getItem('userId');
            if (!userId) {
                console.error('No se encontró el ID del usuario.');
                return;
            }

            try {
                const response = await fetch(`/api/schedules/${userId}`);
                if (!response.ok) {
                    throw new Error('Error al obtener los horarios');
                }
                const data = await response.json();
                setSchedules(data);
            } catch (error) {
                console.error('Error al cargar horarios:', error);
            }
        };

        fetchSchedules();
    }, []);

    const handleTitleChange = (e) => setTitle(e.target.value);

    const handleContentChange = (e) => setContent(e.target.value);

    const handleScheduleChange = (e) => {
        const scheduleId = parseInt(e.target.value, 10);
        const schedule = schedules.find((s) => s.id === scheduleId);
        setSelectedSchedule(schedule);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!selectedSchedule) {
            alert('Por favor selecciona un horario válido.');
            return;
        }

        const now = new Date();
        const scheduleTime = new Date();
        const [hours, minutes] = selectedSchedule.time.split(':').map(Number);
        scheduleTime.setHours(hours, minutes, 0);

        if (scheduleTime < now) {
            alert('Por favor, selecciona otro horario, el seleccionado es de una fecha anterior.');
            return;
        }

        const delay = scheduleTime - now; // Diferencia de tiempo en milisegundos

        try {
            if (delay > 0) {
                alert(`La publicación se programo para las ${selectedSchedule.time}.`);
                setTimeout(async () => {
                    await publishPost();
                }, delay);
            } else {
                await publishPost();
            }

            // Limpiar el estado interno del formulario
            setTitle('');
            setContent('');
            setSelectedSchedule(null);

            // Llamar al método de reinicio del padre
            onReset();

            alert('Publicación realizada con éxito.');
        } catch (error) {
            console.error('Error al realizar la publicación:', error);
            alert('Error al realizar la publicación.');
        }
    };

    const publishPost = async () => {
        const token = sessionStorage.getItem('mastodonToken');
        if (!token) {
            alert('No se encontró el token. Inicia sesión en Mastodon.');
            return;
        }

        const response = await fetch('http://localhost:3000/mastodon/post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                title,
                content,
                token,
            }),
        });

        if (!response.ok) {
            throw new Error('Error al publicar en Mastodon');
        }

        const data = await response.json();
        console.log('Publicado en Mastodon:', data);
    };

    return (
        <div className="post-container">
            <h2 className="post-header">Programar un Post</h2>
            <form onSubmit={handleSubmit} className="post-form">
                <div className="post-group">
                    <label htmlFor="title" className="post-label">Título:</label>
                    <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={handleTitleChange}
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
                        onChange={handleContentChange}
                        className="post-textarea"
                        placeholder="Escribe el contenido aquí"
                        required
                    />
                </div>
                <div className="post-group">
                    <label htmlFor="schedule" className="post-label">Seleccionar horario:</label>
                    <select
                        id="schedule"
                        value={selectedSchedule ? selectedSchedule.id : ''}
                        onChange={handleScheduleChange}
                        className="post-select"
                        required
                    >
                        <option value="" disabled>Elige un horario</option>
                        {schedules.map((schedule) => (
                            <option key={schedule.id} value={schedule.id}>
                                {schedule.day_of_week} - {schedule.time}
                            </option>
                        ))}
                    </select>
                </div>
                <button type="submit" className="post-button">Programar</button>
            </form>
        </div>
    );
};

export default CreateScheduledPost;