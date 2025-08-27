import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/DashboardPage.css';
import BackButton from "../components/BackButton";

const DashboardPage = () => {
    const navigate = useNavigate();
    const [queuePosts, setQueuePosts] = useState([]);
    const [publishedPosts, setPublishedPosts] = useState([]);

    const fetchQueuePosts = async () => {
        try {
            const userId = sessionStorage.getItem('userId');
            if (!userId) return;

            const response = await fetch(`/api/queue-posts/${userId}`);
            if (!response.ok) throw new Error("Error al obtener la cola de publicaciones");
            const data = await response.json();
            setQueuePosts(data.pending);
            setPublishedPosts(data.published);
        } catch (error) {
            console.error(error.message);
        }
    };

    useEffect(() => {
        fetchQueuePosts();
        const intervalId = setInterval(() => {
            fetchQueuePosts();
        }, 30000);
        return () => clearInterval(intervalId);
    }, []);

    const handleCreatePost = () => {
        navigate("/create-post");
    };

    const handleSchedule = () => {
        navigate("/schedule");
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
            <div className="dashboard-page">
                <nav className="dashboard-nav">
                    <ul>
                        <li onClick={handleCreatePost}>Crea una publicación</li>
                        <li onClick={handleSchedule}>Horarios de publicación</li>
                    </ul>
                </nav>
                <div className="dashboard-content">
                    <h2>Publicaciones Pendientes</h2>
                    <table className="dashboard-table">
                        <thead>
                            <tr>
                                <th>Red Social</th>
                                <th>Título</th>
                                <th>Contenido</th>
                                <th>Programado Para</th>
                            </tr>
                        </thead>
                        <tbody>
                            {queuePosts.map(post => (
                                <tr key={post.id}>
                                    <td>{post.social_network}</td>
                                    <td>{post.title}</td>
                                    <td>{post.content}</td>
                                    <td>{new Date(post.scheduled_time).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <h2>Historial de Publicaciones</h2>
                    <table className="dashboard-table">
                        <thead>
                            <tr>
                                <th>Red Social</th>
                                <th>Título</th>
                                <th>Contenido</th>
                                <th>Publicado El</th>
                            </tr>
                        </thead>
                        <tbody>
                            {publishedPosts.map(post => (
                                <tr key={post.id}>
                                    <td>{post.social_network}</td>
                                    <td>{post.title}</td>
                                    <td>{post.content}</td>
                                    <td>{new Date(post.published_at).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
