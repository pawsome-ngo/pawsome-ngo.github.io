// File: pawsome-client-react/src/pages/incident/components/TeamItemsListModal.jsx

import React, { useState, useEffect } from 'react';
import styles from './TeamItemsListModal.module.css'; // We will create this CSS file next
import { FaTimes, FaSpinner, FaPaw } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const TeamItemsListModal = ({ isOpen, onClose, incidentId, token }) => {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isOpen) {
            return;
        }

        const fetchTeamItems = async () => {
            setLoading(true);
            setError(null);
            setItems([]);

            try {
                // Call our new single endpoint
                const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/assignment/team/items`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });

                if (response.ok) {
                    const data = await response.json(); // This will be a Set<String>
                    setItems(data);
                } else {
                    throw new Error(`Failed to load team items (Status: ${response.status})`);
                }

            } catch (err) {
                console.error("Error fetching team items:", err);
                setError(err.message || "A network error occurred.");
            } finally {
                setLoading(false);
            }
        };

        fetchTeamItems();

    }, [isOpen, incidentId, token]);

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h2>Team's Combined Kit</h2>
                    <button onClick={onClose} className={styles.closeButton}>
                        <FaTimes />
                    </button>
                </div>

                <div className={styles.modalBody}>
                    {loading && (
                        <div className={styles.loader}>
                            <FaSpinner className={styles.spinner} />
                            <p>Loading items...</p>
                        </div>
                    )}

                    {error && <p className={styles.errorText}>{error}</p>}

                    {!loading && !error && (
                        <ul className={styles.itemList}>
                            {items.length > 0 ? (
                                items.map((item, index) => (
                                    <li key={index} className={styles.item}>
                                        {item}
                                    </li>
                                ))
                            ) : (
                                <p className={styles.emptyText}>
                                    <FaPaw /> No items found in this team's medicine kits.
                                </p>
                            )}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TeamItemsListModal;