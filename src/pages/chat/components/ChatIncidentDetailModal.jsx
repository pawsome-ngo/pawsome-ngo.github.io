import React, { useState, useEffect } from 'react';
import styles from './ChatIncidentDetailModal.module.css';
import { FaSpinner, FaUser, FaPhone, FaPaw, FaClock, FaMapMarkerAlt, FaInfoCircle, FaTimes, FaUsers } from 'react-icons/fa';
import TeamDetailsModal from '../../incident/components/TeamDetailsModal.jsx'; // Import the TeamDetailsModal

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const ChatIncidentDetailModal = ({ incidentId, token, onClose }) => {
    const [incident, setIncident] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [teamDetails, setTeamDetails] = useState(null);

    useEffect(() => {
        const fetchIncidentDetails = async () => {
            if (!incidentId || !token) {
                setError("Missing incident ID or token.");
                setLoading(false);
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!response.ok) {
                    throw new Error(`Failed to fetch incident details. Status: ${response.status}`);
                }
                const data = await response.json();
                setIncident(data);
            } catch (err) {
                console.error(err);
                setError('Could not connect to the server.');
            } finally {
                setLoading(false);
            }
        };
        fetchIncidentDetails();
    }, [incidentId, token]);

    const handleViewTeam = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/incidents/${incident.id}/assignment/team`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setTeamDetails(data);
                setIsTeamModalOpen(true);
            } else {
                throw new Error("Could not fetch team details.");
            }
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };

    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return 'N/A';
        const date = new Date(dateTimeString);
        return date.toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
        });
    };

    return (
        <>
            <div className={styles.modalOverlay} onClick={onClose}>
                <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                    <button onClick={onClose} className={styles.closeButton}><FaTimes /></button>

                    {loading && <div className={styles.centered}><FaSpinner className={styles.spinner} /></div>}
                    {error && <div className={`${styles.centered} ${styles.error}`}>{error}</div>}

                    {incident && (
                        <>
                            <div className={styles.header}>
                                <h1>Incident #{incident.id}</h1>
                                <div className={styles.tags}>
                                    <span className={styles.status}>{incident.status.replace('_', ' ')}</span>
                                    <span className={styles.animalTag}><FaPaw /> {incident.animalType}</span>
                                </div>
                            </div>

                            <div className={styles.detailGrid}>
                                <div className={styles.detailItem}>
                                    <FaUser className={styles.icon} />
                                    <div>
                                        <strong>Informer</strong>
                                        <p>{incident.informerName}</p>
                                    </div>
                                </div>
                                <div className={styles.detailItem}>
                                    <FaPhone className={styles.icon} />
                                    <div>
                                        <strong>Contact</strong>
                                        <p>{incident.contactNumber}</p>
                                    </div>
                                </div>
                                <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                                    <FaMapMarkerAlt className={styles.icon} />
                                    <div>
                                        <strong>Location</strong>
                                        <p>{incident.location || 'Not yet updated.'}</p>
                                    </div>
                                </div>
                                <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                                    <FaClock className={styles.icon} />
                                    <div>
                                        <strong>Reported At</strong>
                                        <p>{formatDateTime(incident.reportedAt)}</p>
                                    </div>
                                </div>
                                <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                                    <FaInfoCircle className={styles.icon} />
                                    <div>
                                        <strong>Description</strong>
                                        <p>{incident.description}</p>
                                    </div>
                                </div>
                            </div>

                            <div className={styles.actionsContainer}>
                                    <button onClick={handleViewTeam} className={`${styles.actionButton} ${styles.viewTeamButton}`}>
                                        <FaUsers />
                                        <span>View Team</span>
                                    </button>
                                {incident.latitude && incident.longitude && (
                                    <a href={`https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`} target="_blank" rel="noopener noreferrer" className={`${styles.actionButton} ${styles.mapButton}`}>
                                        <FaMapMarkerAlt />
                                        <span>View on Map</span>
                                    </a>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
            {teamDetails && (
                <TeamDetailsModal
                    isOpen={isTeamModalOpen}
                    onClose={() => setIsTeamModalOpen(false)}
                    teamDetails={teamDetails}
                />
            )}
        </>
    );
};

export default ChatIncidentDetailModal;