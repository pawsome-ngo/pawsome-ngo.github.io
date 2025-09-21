import React from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import styles from './IncidentMediaPage.module.css';
import { FaArrowLeft, FaPhotoVideo, FaImage, FaVideo, FaVolumeUp, FaFileAlt } from 'react-icons/fa';

// A helper component to show the correct icon based on media type
const MediaIcon = ({ type }) => {
    switch(type) {
        case 'IMAGE': return <FaImage />;
        case 'VIDEO': return <FaVideo />;
        case 'AUDIO': return <FaVolumeUp />;
        default: return <FaFileAlt />;
    }
};

const IncidentMediaPage = () => {
    const { incidentId } = useParams();
    const location = useLocation();
    const { incident } = location.state || {}; // Get incident data passed from the previous page

    // Robust check for missing incident data
    if (!incident) {
        return (
            <div className={styles.container}>
                <Link to={`/incident/${incidentId}`} className={styles.backLink}>
                    <FaArrowLeft />
                    <span>Back to Incident</span>
                </Link>
                <div className={styles.emptyState}>
                    <FaPhotoVideo className={styles.emptyIcon} />
                    <h1>Error</h1>
                    <p>Incident details were not found. Please return to the previous page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <Link to={`/incident/${incidentId}`} className={styles.backLink}>
                <FaArrowLeft />
                <span>Back to Incident Details</span>
            </Link>

            <header className={styles.header}>
                <h1>Media for Incident #{incident.id}</h1>
            </header>

            {incident.mediaFiles && incident.mediaFiles.length > 0 ? (
                <div className={styles.linkList}>
                    {incident.mediaFiles.map(mediaItem => (
                        <a
                            key={mediaItem.id}
                            href={mediaItem.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.linkItem}
                        >
                            <MediaIcon type={mediaItem.mediaType} />
                            <span>Download Media File ({mediaItem.mediaType.toLowerCase()})</span>
                        </a>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <FaPhotoVideo className={styles.emptyIcon} />
                    <h2>No Media Available</h2>
                    <p>There are no photos, videos, or audio recordings attached to this incident.</p>
                </div>
            )}
        </div>
    );
};

export default IncidentMediaPage;