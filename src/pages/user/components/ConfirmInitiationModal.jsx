// File: pawsome-ngo/full/full-d91a39b5e3886f03789eb932561a5689b5f95888/pawsome-frontend-code-react/src/pages/user/components/ConfirmInitiationModal.jsx

import React, { useState, useEffect } from 'react';
import styles from './ConfirmInitiationModal.module.css';
import { FaSpinner, FaUsers, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const ConfirmInitiationModal = ({ incidentId, token, onClose, onConfirmSuccess }) => {
    const [teamMembers, setTeamMembers] = useState([]);
    // --- ✨ Initialize selectedMemberIds as an empty Set ---
    const [selectedMemberIds, setSelectedMemberIds] = useState(new Set());
    // --- End Change ---
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const fetchTeam = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/assignment/team`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch assigned team details.');
                }
                const data = await response.json();
                setTeamMembers(data.teamMembers || []);
                // --- ✨ Removed logic that initially selected all members ---
                // const initialSelection = new Set(data.teamMembers?.map(m => m.userId) || []);
                // setSelectedMemberIds(initialSelection);
                // --- End Change ---
            } catch (err) {
                setError(err.message || 'Could not fetch team.');
            } finally {
                setLoading(false);
            }
        };

        fetchTeam();
    }, [incidentId, token]);

    const handleCheckboxChange = (userId) => {
        setSelectedMemberIds(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(userId)) {
                newSelection.delete(userId);
            } else {
                newSelection.add(userId);
            }
            return newSelection;
        });
    };

    const handleSubmit = async () => {
        if (selectedMemberIds.size === 0) {
            setError('Please select at least one participating member.');
            return;
        }
        setIsSubmitting(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/cases/${incidentId}/initiate-confirm`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ participatingUserIds: Array.from(selectedMemberIds) }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || `Failed to confirm initiation (Status: ${response.status})`);
            }

            // Success!
            onConfirmSuccess(incidentId); // Notify parent page
            onClose(); // Close the modal

        } catch (err) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <h2>Confirm Case Initiation</h2>
                <p>Select the team members who are present and initiating this case now.</p>

                {loading && <div className={styles.centered}><FaSpinner className={styles.spinner} /> Loading team...</div>}

                {!loading && teamMembers.length > 0 && (
                    <div className={styles.memberList}>
                        {teamMembers.map(member => (
                            <label key={member.userId} className={styles.memberItem}>
                                <input
                                    type="checkbox"
                                    checked={selectedMemberIds.has(member.userId)}
                                    onChange={() => handleCheckboxChange(member.userId)}
                                />
                                <span>{member.fullName || member.firstName}</span>
                            </label>
                        ))}
                    </div>
                )}

                {error && (
                    <div className={`${styles.message} ${styles.error}`}>
                        <FaExclamationCircle /> {error}
                    </div>
                )}

                <div className={styles.actions}>
                    <button onClick={onClose} className={styles.cancelButton} disabled={isSubmitting}>
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        className={styles.confirmButton}
                        disabled={loading || isSubmitting || selectedMemberIds.size === 0}
                    >
                        {isSubmitting ? <FaSpinner className={styles.spinner} /> : <><FaCheckCircle /> Confirm & Initiate</>}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmInitiationModal;