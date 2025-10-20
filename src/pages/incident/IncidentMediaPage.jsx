// File: pawsome-ngo/full/full-d91a39b5e3886f03789eb932561a5689b5f95888/pawsome-frontend-code-react/src/pages/incident/IncidentMediaPage.jsx

import React, { useMemo } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import styles from './IncidentMediaPage.module.css';
import { FaArrowLeft, FaPhotoVideo, FaImage, FaVideo, FaVolumeUp, FaFileAlt, FaFolder, FaFolderOpen } from 'react-icons/fa';

// Import the API_BASE_URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// A helper component to show the correct icon based on media type (used as a fallback)
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
    const { incident } = location.state || {};

    const categorizedMedia = useMemo(() => {
        if (!incident?.mediaFiles) return {};

        return incident.mediaFiles.reduce((acc, mediaItem) => {
            const key = mediaItem.caseId ? `Case #${mediaItem.caseId}` : 'Initial Report';
            if (!acc[key]) {
                acc[key] = [];
            }
            acc[key].push(mediaItem);
            return acc;
        }, {});
    }, [incident]);


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

    // Helper to render the correct media element
    const renderMediaElement = (mediaItem) => {
        // Construct the full, absolute URL for the file
        const absoluteUrl = `${API_BASE_URL}${mediaItem.url}`;

        switch(mediaItem.mediaType) {
            case 'IMAGE':
                return (
                    <a href={absoluteUrl} target="_blank" rel="noopener noreferrer" className={styles.mediaItem}>
                        <img
                            src={absoluteUrl}
                            alt={`Incident media ${mediaItem.id}`}
                            loading="lazy"
                            className={styles.mediaImage}
                        />
                    </a>
                );
            case 'VIDEO':
                return (
                    <div className={styles.mediaItem}>
                        <video controls className={styles.mediaVideo}>
                            <source src={absoluteUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                );
            case 'AUDIO':
                return (
                    <div className={styles.mediaItem}>
                        <audio controls className={styles.mediaAudio}>
                            <source src={absoluteUrl} type="audio/wav" />
                            Your browser does not support the audio element.
                        </audio>
                    </div>
                );
            default:
                // Fallback for unknown types (same as old link)
                return (
                    <a
                        href={absoluteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${styles.mediaItem} ${styles.linkItem}`} // Use mediaItem for grid, linkItem for link style
                    >
                        <MediaIcon type={mediaItem.mediaType} />
                        <span>Download File ({mediaItem.mediaType ? mediaItem.mediaType.toLowerCase() : 'unknown'})</span>
                    </a>
                );
        }
    };

    return (
        <div className={styles.container}>
            <Link to={`/incident/${incidentId}`} className={styles.backLink}>
                <FaArrowLeft />
                <span>Back to Incident Details</span>
            </Link>

            <header className={styles.header}>
                <h1>Media for Incident #{incident.id}</h1>
            </header>

            {Object.keys(categorizedMedia).length > 0 ? (
                <div className={styles.categoryList}>
                    {Object.entries(categorizedMedia).map(([category, mediaItems]) => (
                        <details key={category} open className={styles.categorySection}>
                            <summary className={styles.categoryHeader}>
                                <FaFolderOpen className={styles.folderIconOpen} />
                                <FaFolder className={styles.folderIconClosed} />
                                <span>{category} ({mediaItems.length})</span>
                            </summary>
                            {/* --- ✨ UPDATED: Using mediaGrid instead of linkList --- */}
                            <div className={styles.mediaGrid}>
                                {mediaItems.map(mediaItem => (
                                    <React.Fragment key={mediaItem.id}>
                                        {renderMediaElement(mediaItem)}
                                    </React.Fragment>
                                ))}
                            </div>
                            {/* --- End Update --- */}
                        </details>
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