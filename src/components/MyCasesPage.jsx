import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './MyCasesPage.module.css';
import { FaSpinner, FaPaw, FaUser, FaInfoCircle } from 'react-icons/fa';
import MarkAsDoneModal from './MarkAsDoneModal'; // Import the modal

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const MyCasesPage = ({ token }) => {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // State to manage the modal and button loading states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIncident, setSelectedIncident] = useState(null);
    const [initiatingCaseId, setInitiatingCaseId] = useState(null);

    useEffect(() => {
        const fetchMyCases = async () => {
            if (!token) {
                setError("Token not found. Please log in.");
                setLoading(false);
                return;
            }
            try {
                const response = await fetch(`${API_BASE_URL}/api/cases/my-cases`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!response.ok) throw new Error('Failed to fetch cases.');
                const data = await response.json();
                setCases(data);
            } catch (err) {
                setError('Could not connect to the server.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchMyCases();
    }, [token]);

    const handleInitiateCase = async (incidentId, e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent card's Link navigation
        setInitiatingCaseId(incidentId);

        try {
            const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/initiate`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                // Update the status in the UI for instant feedback
                setCases(prevCases => prevCases.map(c =>
                    c.id === incidentId ? { ...c, status: 'IN_PROGRESS' } : c
                ));
            } else {
                const errorData = await response.text();
                alert(`Failed to initiate case: ${errorData}`);
            }
        } catch (err) {
            console.error("Failed to initiate case:", err);
            alert('An error occurred. Please try again.');
        } finally {
            setInitiatingCaseId(null);
        }
    };

    const openCompletionModal = (incident, e) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIncident(incident);
        setIsModalOpen(true);
    };

    const handleCaseCompleted = (completedIncidentId) => {
        // Find the case that was completed
        const completedCase = cases.find(c => c.id === completedIncidentId);
        if (completedCase) {
            // Update its status to ONGOING for instant UI feedback
            setCases(prevCases => prevCases.map(c =>
                c.id === completedIncidentId ? { ...c, status: 'ONGOING' } : c
            ));
        }
    };

    if (loading) return <div className={styles.container}>Loading your cases...</div>;
    if (error) return <div className={styles.container} style={{ color: 'red' }}>{error}</div>;

    return (
        <div className={styles.container}>
            <h1>My Assigned Cases</h1>
            <div className={styles.cardGrid}>
                {cases.map(incident => (
                    <Link to={`/incident/${incident.id}`} key={incident.id} className={`${styles.card} ${styles[incident.status.toLowerCase()]}`}>
                        <div className={styles.cardContent}>
                            <div className={styles.cardHeader}>
                                <h2><FaPaw /> {incident.animalType} - Incident #{incident.id}</h2>
                                <span className={`${styles.statusTag} ${styles[incident.status.toLowerCase() + 'Tag']}`}>
                                    {incident.status.replace('_', ' ')}
                                </span>
                            </div>
                            <div className={styles.infoRow}>
                                <FaUser />
                                <span>{incident.informerName}</span>
                            </div>
                            <div className={styles.infoRow}>
                                <FaInfoCircle />
                                <span>{incident.description}</span>
                            </div>
                        </div>

                        <div className={styles.cardActions}>
                            {incident.status === 'ASSIGNED' && (
                                <button
                                    onClick={(e) => handleInitiateCase(incident.id, e)}
                                    disabled={initiatingCaseId === incident.id}
                                    className={styles.initiateButton}
                                >
                                    {initiatingCaseId === incident.id ? <FaSpinner className={styles.spinner} /> : 'Initiate Case'}
                                </button>
                            )}

                            {incident.status === 'IN_PROGRESS' && (
                                <button
                                    onClick={(e) => openCompletionModal(incident, e)}
                                    className={styles.doneButton}
                                >
                                    Mark as Done
                                </button>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
            {cases.length === 0 && !loading && (
                <p className={styles.noIncidents}>You have no active cases assigned to you.</p>
            )}

            {isModalOpen && (
                <MarkAsDoneModal
                    incident={selectedIncident}
                    token={token}
                    onClose={() => setIsModalOpen(false)}
                    onCaseCompleted={handleCaseCompleted}
                />
            )}
        </div>
    );
};

export default MyCasesPage;