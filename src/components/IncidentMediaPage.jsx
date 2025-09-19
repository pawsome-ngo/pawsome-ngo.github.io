import React from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import styles from './IncidentMediaPage.module.css';
import { FaArrowLeft, FaVolumeUp } from 'react-icons/fa';

const IncidentMediaPage = () => {
    const { incidentId } = useParams();
    const location = useLocation();
    const { incident } = location.state || {}; // Get the incident data passed from the previous page

    if (!incident || !incident.mediaFiles || incident.mediaFiles.length === 0) {
        return (
            <div className={styles.container}>
                <Link to={`/incident/${incidentId}`} className={styles.backLink}>
                    <FaArrowLeft />
                    <span>Back to Incident</span>
                </Link>
                <h1>No Media Found</h1>
                <p>There are no media files available for this incident.</p>
            </div>
        );
    }

    // Separate media files into visual (images/videos) and audio
    const visualMedia = incident.mediaFiles.filter(m => m.mediaType === 'IMAGE' || m.mediaType === 'VIDEO');
    const audioMedia = incident.mediaFiles.filter(m => m.mediaType === 'AUDIO');

    return (
        <div className={styles.container}>
            <Link to={`/incident/${incidentId}`} className={styles.backLink}>
                <FaArrowLeft />
                <span>Back to Incident Details</span>
            </Link>
            <h1>Media for Incident #{incident.id}</h1>

            {/* Section for Audio Files */}
            {audioMedia.length > 0 && (
                <div className={styles.audioSection}>
                    <h2>Audio Recordings</h2>
                    <div className={styles.audioList}>
                        {audioMedia.map(mediaItem => (
                            <div key={mediaItem.id} className={styles.audioItem}>
                                <FaVolumeUp className={styles.audioIcon} />
                                {/* This is the corrected, more robust audio player */}
                                <audio controls src={mediaItem.url}>
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Section for Images and Videos */}
            {visualMedia.length > 0 && (
                <div className={styles.mediaGrid}>
                    {visualMedia.map(mediaItem => (
                        <div key={mediaItem.id} className={styles.mediaItem}>
                            {mediaItem.mediaType === 'IMAGE' && (
                                <img src={mediaItem.url} alt={`Incident media ${mediaItem.id}`} />
                            )}
                            {mediaItem.mediaType === 'VIDEO' && (
                                <video controls src={mediaItem.url}>
                                    Your browser does not support the video tag.
                                </video>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default IncidentMediaPage;