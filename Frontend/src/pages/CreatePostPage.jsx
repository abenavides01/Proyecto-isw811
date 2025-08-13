import React, { useState } from 'react';
import '../styles/CreatePostPage.css';
import InstantPost from '../components/CreateInstantPost';
import ScheduledPost from '../components/CreateScheduledPost';
import QueuePost from '../components/CreatePostInQueue';

const CreatePostPage = () => {
    const [selectedPostType, setSelectedPostType] = useState('');
    const [selectedSocialMedia, setSelectedSocialMedia] = useState('');

    const resetForm = () => {
        setSelectedPostType('');
        setSelectedSocialMedia('');
    };

    const renderPostComponent = () => {
        switch (selectedPostType) {
            case 'instantaneo':
                return (
                    <InstantPost 
                        selectedSocialMedia={selectedSocialMedia} 
                        onReset={resetForm}
                    />
                );
            case 'cola':
                return <QueuePost 
                    selectedSocialMedia={selectedSocialMedia}
                    onReset={resetForm}
                
                />;
            case 'programado':
                return <ScheduledPost
                    selectedSocialMedia={selectedSocialMedia}
                    onReset={resetForm}
                    />;
            default:
                return null;
        }
    };

    return (
        <div className="create-post-page">
            <h1 className="create-post-title">Crear Post</h1>
            <div className="form-container">
                <label className="form-label" htmlFor="social_media_option">
                    Seleccione una red social:
                </label>
                <select
                    className="form-select"
                    name="social-media"
                    id="social_media_option"
                    value={selectedSocialMedia} // Asegurar que el valor sea controlado
                    onChange={(e) => setSelectedSocialMedia(e.target.value)}
                >
                    <option value="" disabled>
                        Seleccione
                    </option>
                    <option value="red1">Linkedin</option>
                    <option value="mastodon">Mastodon</option>
                    <option value="ambas">Ambas</option>
                </select>

                <label className="form-label" htmlFor="type_post">
                    Seleccione el tipo de post:
                </label>
                <select
                    className="form-select"
                    name="type-post"
                    id="type_post"
                    value={selectedPostType} // Asegurar que el valor sea controlado
                    onChange={(e) => setSelectedPostType(e.target.value)}
                >
                    <option value="" disabled>
                        Seleccione
                    </option>
                    <option value="instantaneo">Instantáneo</option>
                    <option value="cola">En cola</option>
                    <option value="programado">Programado</option>
                </select>

                <div className="posts-field">{renderPostComponent()}</div>
            </div>
        </div>
    );
};

export default CreatePostPage;
