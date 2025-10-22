import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './IncidentMediaPage.module.css';
import {
    FaArrowLeft, FaPhotoVideo, FaImage, FaVideo, FaVolumeUp, FaFileAlt,
    FaFolder, FaFolderOpen, FaSpinner, FaTrash, FaExclamationTriangle
} from 'react-icons/fa';
import ConfirmationModal from '../../components/common/ConfirmationModal.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const MediaIcon = ({ type }) => {
    // ... (MediaIcon component remains the same)
    switch(type) {
        case 'IMAGE': return <FaImage />;
        case 'VIDEO': return <FaVideo />;
        case 'AUDIO': return <FaVolumeUp />;
        default: return <FaFileAlt />;
    }
};

// --- Receive currentUser prop ---
const IncidentMediaPage = ({ token, currentUser }) => {
    const { incidentId } = useParams();
    const [incident, setIncident] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [mediaToDelete, setMediaToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // --- Check if user has permission ---
    const canDeleteMedia = useMemo(() =>
            currentUser?.roles?.includes('ROLE_ADMIN') || currentUser?.roles?.includes('ROLE_SUPER_ADMIN'),
        [currentUser]
    );

    const fetchIncidentDetails = useCallback(async () => {
        // ... (fetchIncidentDetails remains the same)
        if (!token || !incidentId) {
            setError("Missing token or incident ID.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch incident details (Status: ${response.status})`);
            }
            const data = await response.json();
            setIncident(data);
        } catch (err) {
            setError(err.message || 'Could not connect to server.');
        } finally {
            setLoading(false);
        }
    }, [incidentId, token]);

    useEffect(() => {
        fetchIncidentDetails();
    }, [fetchIncidentDetails]);

    const handleDeleteMedia = (mediaId, event) => {
        event.preventDefault();
        event.stopPropagation();
        setMediaToDelete(mediaId);
    };

    const confirmDeleteMedia = async () => {
        // ... (confirmDeleteMedia remains the same)
        if (!mediaToDelete) return;
        setIsDeleting(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/media/${mediaToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const resultData = await response.json().catch(() => ({}));
            if (!response.ok) {
                throw new Error(resultData.message || `Failed to delete media item (Status: ${response.status})`);
            }
            setIncident(prevIncident => {
                if (!prevIncident) return null;
                const updatedMediaFiles = prevIncident.mediaFiles.filter(mf => mf.id !== mediaToDelete);
                return {
                    ...prevIncident,
                    mediaFiles: updatedMediaFiles,
                    mediaFileCount: updatedMediaFiles.length
                };
            });
            setMediaToDelete(null);
        } catch (err) {
            console.error("Deletion error:", err);
            setError(err.message || "An error occurred while deleting the media.");
        } finally {
            setIsDeleting(false);
        }
    };


    const categorizedMedia = useMemo(() => {
        // ... (categorizedMedia remains the same)
        if (!incident?.mediaFiles) return {};
        return incident.mediaFiles.reduce((acc, mediaItem) => {
            const key = mediaItem.caseId ? `Case #${mediaItem.caseId}` : 'Initial Report';
            if (!acc[key]) acc[key] = [];
            acc[key].push(mediaItem);
            return acc;
        }, {});
    }, [incident]);

    const renderMediaElement = (mediaItem) => {
        const absoluteUrl = `${API_BASE_URL}${mediaItem.url}`;
        const mediaId = mediaItem.id;

        return (
            <div className={styles.mediaItemContainer}>
                {/* --- Conditionally render the delete button based on role --- */}
                {canDeleteMedia && (
                    <button
                        className={styles.deleteButton}
                        onClick={(e) => handleDeleteMedia(mediaId, e)}
                        title="Delete Media"
                        disabled={isDeleting && mediaToDelete === mediaId}
                    >
                        <FaTrash />
                    </button>
                )}
                {/* --- End Conditional Rendering --- */}

                {/* --- Existing Media Rendering Logic --- */}
                {mediaItem.mediaType === 'IMAGE' ? (
                    <a href={absoluteUrl} target="_blank" rel="noopener noreferrer" className={styles.mediaItem}>
                        <img src={absoluteUrl} alt={`Incident media ${mediaId}`} loading="lazy" className={styles.mediaImage} />
                    </a>
                ) : mediaItem.mediaType === 'VIDEO' ? (
                    <div className={styles.mediaItem}>
                        <video controls className={styles.mediaVideo}>
                            <source src={absoluteUrl} type="video/mp4" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                ) : mediaItem.mediaType === 'AUDIO' ? (
                    <div className={styles.mediaItem}>
                        <audio controls className={styles.mediaAudio}>
                            <source src={absoluteUrl} type="audio/wav" />
                            Your browser does not support the audio element.
                        </audio>
                    </div>
                ) : (
                    <a href={absoluteUrl} target="_blank" rel="noopener noreferrer" className={`${styles.mediaItem} ${styles.linkItem}`}>
                        <MediaIcon type={mediaItem.mediaType} />
                        <span>Download File ({mediaItem.mediaType ? mediaItem.mediaType.toLowerCase() : 'unknown'})</span>
                    </a>
                )}
            </div>
        );
    };

    // ... Loading, Error, No Incident states ...
    if (loading) {
        return (
            <div className={styles.container}>
                <Link to={`/incident/${incidentId}`} className={styles.backLink}>
                    <FaArrowLeft />
                    <span>Back to Incident</span>
                </Link>
                <div className={styles.emptyState}> {/* Reusing empty state style for loading */}
                    <FaSpinner style={{ animation: 'spin 1s linear infinite' }} />
                    <h2>Loading Media...</h2>
                </div>
            </div>
        );
    }

    // Show error only if not in the delete confirmation step
    if (error && !mediaToDelete) {
        return (
            <div className={styles.container}>
                <Link to={`/incident/${incidentId}`} className={styles.backLink}>
                    <FaArrowLeft />
                    <span>Back to Incident</span>
                </Link>
                <div className={styles.emptyState}>
                    <FaPhotoVideo className={styles.emptyIcon} />
                    <h1>Error</h1>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    if (!incident && !loading) {
        return (
            <div className={styles.container}>
                <Link to={`/incident/${incidentId}`} className={styles.backLink}>
                    <FaArrowLeft />
                    <span>Back to Incident</span>
                </Link>
                <div className={styles.emptyState}>
                    <FaPhotoVideo className={styles.emptyIcon} />
                    <h1>Incident Not Found</h1>
                    <p>The details for this incident could not be loaded.</p>
                </div>
            </div>
        );
    }


    return (
        <>
            <div className={styles.container}>
                <Link to={`/incident/${incidentId}`} className={styles.backLink}>
                    <FaArrowLeft />
                    <span>Back to Incident Details</span>
                </Link>

                <header className={styles.header}>
                    <h1>Media for Incident #{incident?.id}</h1>
                </header>

                {/* Display general error if not related to deletion */}
                {error && !mediaToDelete && <p className={styles.errorMessage}><FaExclamationTriangle/> {error}</p>}


                {Object.keys(categorizedMedia).length > 0 ? (
                    <div className={styles.categoryList}>
                        {Object.entries(categorizedMedia).map(([category, mediaItems]) => (
                            <details key={category} open className={styles.categorySection}>
                                <summary className={styles.categoryHeader}>
                                    <FaFolderOpen className={styles.folderIconOpen} />
                                    <FaFolder className={styles.folderIconClosed} />
                                    <span>{category} ({mediaItems.length})</span>
                                </summary>
                                <div className={styles.mediaGrid}>
                                    {mediaItems.map(mediaItem => (
                                        <React.Fragment key={mediaItem.id}>
                                            {renderMediaElement(mediaItem)}
                                        </React.Fragment>
                                    ))}
                                </div>
                            </details>
                        ))}
                    </div>
                ) : (
                    !loading && !error && (
                        <div className={styles.emptyState}>
                            <FaPhotoVideo className={styles.emptyIcon} />
                            <h2>No Media Available</h2>
                            <p>There are no photos, videos, or audio recordings attached to this incident.</p>
                        </div>
                    )
                )}
            </div>

            {/* --- Confirmation Modal for Deletion --- */}
            {mediaToDelete !== null && (
                <ConfirmationModal
                    message={
                        <>
                            Are you sure you want to permanently delete this media item?
                            {/* Show specific error during confirmation if one occurred */}
                            {error && <p className={styles.errorMessage} style={{marginTop: '1rem'}}><FaExclamationTriangle/> {error}</p>}
                        </>
                    }
                    confirmText={isDeleting ? "Deleting..." : "Yes, Delete"}
                    confirmClass="delete"
                    onConfirm={confirmDeleteMedia}
                    onCancel={() => { setMediaToDelete(null); setError(null); }}
                    confirmDisabled={isDeleting}
                    cancelDisabled={isDeleting}
                />
            )}
        </>
    );
};

export default IncidentMediaPage;