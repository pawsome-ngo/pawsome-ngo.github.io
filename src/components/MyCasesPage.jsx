import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './MyCasesPage.module.css';
import { FaSpinner, FaPaw, FaUser, FaInfoCircle, FaDog, FaCat, FaDove, FaAngleRight, FaInbox, FaUsers } from 'react-icons/fa';
import MarkAsDoneModal from './MarkAsDoneModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Animal Icon component
const AnimalIcon = ({ type }) => {
    switch (type) {
        case 'DOG': return <FaDog />;
        case 'CAT': return <FaCat />;
        case 'BIRD': return <FaDove />;
        default: return <FaPaw />;
    }
};

const MyCasesPage = ({ token }) => {
    const [cases, setCases] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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
                if (!response.ok) throw new Error('Failed to fetch your assigned cases.');
                const data = await response.json();
                setCases(data);
            } catch (err) {
                setError(err.message || 'Could not connect to the server.');
            } finally {
                setLoading(false);
            }
        };
        fetchMyCases();
    }, [token]);

    const handleInitiateCase = async (incidentId, e) => {
        e.preventDefault();
        e.stopPropagation();
        setInitiatingCaseId(incidentId);

        try {
            const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/initiate`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
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
        // --- THIS IS THE FIX ---
        // Instead of updating the item's status, we filter it out of the list.
        setCases(prevCases => prevCases.filter(c => c.id !== completedIncidentId));
    };

    if (loading) return <div className={styles.container}><div className={styles.centered}><FaSpinner className={styles.spinner} /></div></div>;
    if (error) return <div className={styles.container}><p className={styles.error}>{error}</p></div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>My Active Cases</h1>
                <p>Here are the incidents that require your attention.</p>
            </div>

            {cases.length > 0 ? (
                <div className={styles.cardGrid}>
                    {cases.map(incident => (
                        <div key={incident.id} className={`${styles.card} ${styles[incident.status.toLowerCase()]}`}>
                            <Link to={`/incident/${incident.id}`} className={styles.cardLink}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.cardIcon}>
                                        <AnimalIcon type={incident.animalType} />
                                    </div>
                                    <div className={styles.headerText}>
                                        <h2>{incident.animalType} - Incident #{incident.id}</h2>
                                        <span className={styles.statusTag}>
                                            {incident.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.infoRow}>
                                        <FaUser />
                                        <span>Informer: <strong>{incident.informerName}</strong></span>
                                    </div>
                                    <div className={styles.infoRow}>
                                        <FaInfoCircle />
                                        <p>{incident.description}</p>
                                    </div>
                                </div>
                                <div className={styles.cardFooter}>
                                    <span>View Details</span>
                                    <FaAngleRight />
                                </div>
                            </Link>
                            <div className={styles.cardActions}>
                                {incident.status === 'ASSIGNED' && (
                                    <button
                                        onClick={(e) => handleInitiateCase(incident.id, e)}
                                        disabled={initiatingCaseId === incident.id}
                                        className={styles.actionButton}
                                    >
                                        {initiatingCaseId === incident.id ? <FaSpinner className={styles.spinner} /> : 'Initiate Case'}
                                    </button>
                                )}

                                {incident.status === 'IN_PROGRESS' && (
                                    <button
                                        onClick={(e) => openCompletionModal(incident, e)}
                                        className={styles.actionButton}
                                    >
                                        Mark as Done
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <FaInbox className={styles.emptyIcon} />
                    <h2>No Active Cases</h2>
                    <p>It looks like you haven't been assigned to any rescue cases yet. Great job staying on top of things!</p>
                    <Link to="/live" className={styles.actionButtonLink}>
                        <FaUsers /> View Live Incidents
                    </Link>
                </div>
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