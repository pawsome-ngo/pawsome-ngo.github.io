// File: pawsome-ngo/full/full-d91a39b5e3886f03789eb932561a5689b5f95888/pawsome-frontend-code-react/src/pages/user/MyCasesPage.jsx

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './MyCasesPage.module.css';
// Import FaPaw for the loading spinner
import { FaPaw, FaUser, FaInfoCircle, FaDog, FaCat, FaDove, FaAngleRight, FaInbox, FaUsers } from 'react-icons/fa'; // FaSpinner is only needed inside the modal now
import MarkAsDoneModal from './components/MarkAsDoneModal.jsx';
// --- ✨ Import the new modal ---
import ConfirmInitiationModal from './components/ConfirmInitiationModal.jsx';

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
    const [isCompletionModalOpen, setIsCompletionModalOpen] = useState(false); // Renamed state
    const [selectedIncidentForCompletion, setSelectedIncidentForCompletion] = useState(null); // Renamed state
    // --- ✨ State for the new confirmation modal ---
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [incidentToConfirm, setIncidentToConfirm] = useState(null);

    useEffect(() => {
        const fetchMyCases = async () => {
            if (!token) {
                setError("Token not found. Please log in.");
                setLoading(false);
                return;
            }
            // Start loading state
            setLoading(true);
            setError(null); // Clear previous errors

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
                setLoading(false); // End loading state
            }
        };
        fetchMyCases();
    }, [token]);

    // --- ✨ Modified function to OPEN the confirmation modal ---
    const handleOpenInitiateModal = (incidentId, e) => {
        e.preventDefault();
        e.stopPropagation();
        setIncidentToConfirm(incidentId); // Store the ID of the incident to confirm
        setIsConfirmModalOpen(true);     // Open the modal
    };
    // --- End modification ---

    const openCompletionModal = (incident, e) => {
        e.preventDefault();
        e.stopPropagation();
        setSelectedIncidentForCompletion(incident);
        setIsCompletionModalOpen(true);
    };

    const handleCaseCompleted = (completedIncidentId) => {
        setCases(prevCases => prevCases.filter(c => c.id !== completedIncidentId));
        // No need to update status locally here as the item is removed
    };

    // --- ✨ NEW Handler for successful confirmation ---
    const handleConfirmSuccess = (initiatedIncidentId) => {
        // Update the status of the specific incident in the local state
        setCases(prevCases => prevCases.map(c =>
            c.id === initiatedIncidentId ? { ...c, status: 'IN_PROGRESS' } : c
        ));
        // Optionally refetch if needed, but local update is often faster UX
        // fetchMyCases();
    };
    // --- End New Handler ---

    // --- ✨ UPDATED Loading State Return ---
    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.pawSpinner}>
                    <FaPaw className={styles.pawIcon} />
                </div>
                <p>Loading Your Cases...</p> {/* Changed text slightly */}
            </div>
        );
    }
    // --- End Updated Loading State ---

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
                                {/* --- ✨ Updated onClick handler --- */}
                                {incident.status === 'ASSIGNED' && (
                                    <button
                                        onClick={(e) => handleOpenInitiateModal(incident.id, e)} // Use new handler
                                        className={styles.actionButton}
                                        // Removed disabled state related to initiatingCaseId
                                    >
                                        Initiate Case
                                    </button>
                                )}
                                {/* --- End update --- */}

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

            {isCompletionModalOpen && (
                <MarkAsDoneModal
                    incident={selectedIncidentForCompletion}
                    token={token}
                    onClose={() => setIsCompletionModalOpen(false)}
                    onCaseCompleted={handleCaseCompleted}
                />
            )}

            {/* --- ✨ Render the new confirmation modal --- */}
            {isConfirmModalOpen && incidentToConfirm && (
                <ConfirmInitiationModal
                    incidentId={incidentToConfirm}
                    token={token}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirmSuccess={handleConfirmSuccess}
                />
            )}
            {/* --- End rendering --- */}
        </div>
    );
};

export default MyCasesPage;