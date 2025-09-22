import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import styles from './TeamAssignmentPage.module.css';
import { FaArrowLeft, FaMotorcycle, FaMedkit, FaHeart, FaExclamationCircle, FaHistory } from 'react-icons/fa';
import CustomSelect from './CustomSelect';
import AssignmentSuccessModal from "./AssignmentSuccessModal.jsx";
import UnauthorizedModal from "./UnauthorizedModal.jsx";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Define the order of experience levels for sorting
const experienceOrder = {
    'Beginner': 1,
    'Intermediate': 2,
    'Advanced': 3,
    'Expert': 4
};

const TeamAssignmentPage = ({ token, currentUser }) => {
    const { incidentId } = useParams();
    const navigate = useNavigate();
    const [volunteers, setVolunteers] = useState([]);
    const [selectedVolunteers, setSelectedVolunteers] = useState(new Set());
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sortOrder, setSortOrder] = useState('default');
    const [assignmentResult, setAssignmentResult] = useState(null);
    const [isUnauthorizedModalOpen, setIsUnauthorizedModalOpen] = useState(false);

    // FIX: Check for all valid roles
    const canAssignTeam = useMemo(() =>
            currentUser?.roles.includes('ROLE_RESCUE_CAPTAIN') ||
            currentUser?.roles.includes('ROLE_ADMIN') ||
            currentUser?.roles.includes('ROLE_SUPER_ADMIN'),
        [currentUser]
    );

    useEffect(() => {
        const fetchVolunteers = async () => {
            if (!token || !incidentId) return;
            try {
                const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/assignment/volunteers`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    setVolunteers(data);
                } else {
                    setError('Failed to fetch volunteer list.');
                }
            } catch (err) {
                setError('Could not connect to the server.');
            } finally {
                setLoading(false);
            }
        };
        fetchVolunteers();
    }, [token, incidentId]);

    const sortedVolunteers = useMemo(() => {
        const sorted = [...volunteers];
        if (sortOrder === 'proximity') {
            sorted.sort((a, b) => (a.distanceFromIncident || Infinity) - (b.distanceFromIncident || Infinity));
        } else if (sortOrder === 'experience') {
            sorted.sort((a, b) => (experienceOrder[b.experienceLevel] || 0) - (experienceOrder[a.experienceLevel] || 0));
        }
        return sorted;
    }, [volunteers, sortOrder]);

    const handleSelectVolunteer = (userId) => {
        const newSelection = new Set(selectedVolunteers);
        if (newSelection.has(userId)) {
            newSelection.delete(userId);
        } else {
            newSelection.add(userId);
        }
        setSelectedVolunteers(newSelection);
    };

    const handleAssignTeam = async () => {
        // Log the current user and their roles for debugging
        console.log("Current User:", currentUser);
        console.log("Can Assign Team:", canAssignTeam);

        // FIX: Use the new, more inclusive check
        if (!canAssignTeam) {
            setIsUnauthorizedModalOpen(true);
            return;
        }

        setIsSubmitting(true);
        const payload = { userIds: Array.from(selectedVolunteers) };
        try {
            const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/assignment/assign-team`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });
            if (response.ok) {
                const resultData = await response.json();
                setAssignmentResult(resultData);
            } else {
                throw new Error("Failed to assign team.");
            }
        } catch (err) {
            console.error("Assignment error:", err);
            alert("An error occurred while assigning the team. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeModalAndNavigate = () => {
        setAssignmentResult(null);
        navigate('/live'); // Navigate to the Live Page
    };

    const sortOptions = [
        { value: 'default', label: 'Default' },
        { value: 'experience', label: 'Experience' },
        { value: 'proximity', label: 'Proximity' }
    ];

    if (loading) return <div className={styles.container}>Loading volunteers...</div>;
    if (error) return <div className={styles.container} style={{ color: 'red' }}>{error}</div>;

    return (
        <>
            <div className={styles.container}>
                <div className={styles.header}>
                    <Link to={`/incident/${incidentId}`} className={styles.backLink}>
                        <FaArrowLeft />
                        <span>Back to Incident</span>
                    </Link>
                    <div className={styles.sortContainer}>
                        <label htmlFor="sort-order">Sort By:</label>
                        <CustomSelect
                            name="sortOrder"
                            options={sortOptions}
                            value={sortOrder}
                            onChange={(e) => setSortOrder(e.target.value)}
                        />
                    </div>
                </div>

                <div className={styles.volunteerList}>
                    {sortedVolunteers.map(v => (
                        <div
                            key={v.userId}
                            className={`${styles.volunteerCard} ${selectedVolunteers.has(v.userId) ? styles.selected : ''} ${v.isEngagedInActiveCase ? styles.engaged : ''}`}
                            onClick={() => handleSelectVolunteer(v.userId)}
                        >
                            <div className={styles.volunteerInfo}>
                                <h3>{v.firstName}</h3>
                                <div className={styles.volunteerSubInfo}>
                                    <span>{v.experienceLevel}</span>
                                    {v.distanceFromIncident !== null && (
                                        <>
                                            <span className={styles.separator}>•</span>
                                            <span className={styles.distance}>
                                                {v.distanceFromIncident.toFixed(1)} km
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className={styles.volunteerIcons}>
                                {v.hasPreviouslyWorkedOnIncident && <FaHistory className={styles.historyIcon} title="Previously worked on this incident" />}
                                {v.isEngagedInActiveCase && <FaExclamationCircle className={styles.engagedIcon} title="Engaged in another case" />}
                                {v.hasShownInterest && <FaHeart className={styles.interestIcon} title="Has shown interest" />}
                                {v.hasVehicle && <FaMotorcycle title="Has two-wheeler" />}
                                {v.hasMedicineBox && <FaMedkit title="Has medicine box" />}
                            </div>
                        </div>
                    ))}
                </div>

                <div className={styles.footer}>
                    <button
                        onClick={handleAssignTeam}
                        disabled={selectedVolunteers.size === 0 || isSubmitting}
                        className={styles.assignButton}
                    >
                        {isSubmitting ? 'Assigning...' : `Assign Team (${selectedVolunteers.size} Selected)`}
                    </button>
                </div>
            </div>

            {assignmentResult && (
                <AssignmentSuccessModal
                    result={assignmentResult}
                    onClose={closeModalAndNavigate}
                />
            )}

            {isUnauthorizedModalOpen && (
                <UnauthorizedModal
                    isOpen={isUnauthorizedModalOpen}
                    onClose={() => setIsUnauthorizedModalOpen(false)}
                    message="You need to have the 'Rescue Captain' or a higher role to assign a team to a case."
                />
            )}
        </>
    );
};

export default TeamAssignmentPage;