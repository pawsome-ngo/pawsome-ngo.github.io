// File: src/pages/admin/SuperAdminPage.jsx
import React, { useState, useEffect, useCallback } from 'react'; // Added useEffect and useCallback
import styles from './SuperAdminPage.module.css';
import ManageUsersModal from './ManageUsersModal.jsx';
// --- ✨ Removed FaDatabase, FaTrashAlt, FaCog (if ConfirmationModal isn't used elsewhere) ---
// --- ✨ Kept FaUsersCog, FaBellSlash, FaTimes, FaSpinner, FaPaw, FaExclamationCircle, FaExclamationTriangle, FaCheckCircle, FaTrash ---
import { FaUsersCog, FaSpinner, FaPaw, FaExclamationTriangle, FaCheckCircle, FaBellSlash, FaTimes, FaTrash, FaExclamationCircle } from 'react-icons/fa';
// ConfirmationModal might still be used by ManageUsersModal indirectly, keep import for now, or remove if truly unused.
import ConfirmationModal from '../../components/common/ConfirmationModal.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const SuperAdminPage = ({ token, currentUser }) => {
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    // Removed actionToConfirm and isProcessing state for generic actions
    const [feedback, setFeedback] = useState({ message: '', type: '' }); // type: 'success' or 'error'

    // --- State for Purge Modal ---
    const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
    const [purgeDays, setPurgeDays] = useState("7"); // Default to 7 days
    const [isProcessingPurge, setIsProcessingPurge] = useState(false);
    const [purgeError, setPurgeError] = useState("");
    // --- End State ---

    // Basic check to ensure only Super Admins see the content
    if (!currentUser?.roles?.includes('ROLE_SUPER_ADMIN')) {
        return (
            <div className={styles.container}>
                <p className={styles.error}>Unauthorized access. You must be a Super Admin to view this page.</p>
            </div>
        );
    }

    // Removed handleActionConfirm and getConfirmationMessage functions

    // --- Handlers for Purge Modal ---
    const openPurgeModal = () => {
        setPurgeDays("7"); // Reset to default
        setPurgeError(""); // Clear old errors
        setFeedback({ message: '', type: '' }); // Clear main page feedback
        setIsPurgeModalOpen(true);
    };

    const closePurgeModal = () => {
        if (isProcessingPurge) return; // Don't close while processing
        setIsPurgeModalOpen(false);
        setPurgeError("");
    };

    const handlePurgeNotifications = async () => {
        setIsProcessingPurge(true);
        setPurgeError("");
        setFeedback({ message: '', type: '' });

        const days = parseInt(purgeDays, 10);
        if (isNaN(days) || days <= 0) {
            setPurgeError("Please enter a valid number of days (1 or more).");
            setIsProcessingPurge(false);
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/notifications/older-than/${days}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            const resultData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(resultData.message || `Failed to purge notifications (Status: ${response.status})`);
            }

            // Success
            setFeedback({ message: resultData.message || `Successfully purged notifications older than ${days} days.`, type: 'success' });
            closePurgeModal();

        } catch (err) {
            setPurgeError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsProcessingPurge(false);
        }
    };
    // --- End Purge Handlers ---

    return (
        <>
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1>Super Admin Panel</h1>
                    <p>Access high-level administrative functions.</p>
                </header>

                {/* Feedback Area */}
                {feedback.message && (
                    <div className={`${styles.feedbackBox} ${styles[feedback.type]}`}>
                        {feedback.type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
                        {feedback.message}
                    </div>
                )}

                {/* Action Grid */}
                <div className={styles.actionGrid}>
                    {/* Manage Users Card */}
                    <div className={styles.actionCard}>
                        <FaUsersCog className={styles.actionIcon} />
                        <h2>Manage Users</h2>
                        <p>View, authorize, deny, or delete user accounts.</p>
                        <button
                            className={styles.actionButton}
                            onClick={() => setIsUserModalOpen(true)}
                            disabled={isProcessingPurge} // Disable if purge is running
                        >
                            Open User Manager
                        </button>
                    </div>

                    {/* --- Purge Notifications Card --- */}
                    <div className={`${styles.actionCard} ${styles.dangerZone}`}>
                        <FaBellSlash className={styles.actionIcon} />
                        <h2>Purge Notifications</h2>
                        <p>Permanently delete all notifications older than a specified number of days.</p>
                        <button
                            className={`${styles.actionButton} ${styles.dangerButton}`}
                            onClick={openPurgeModal}
                            disabled={isProcessingPurge} // Disable if purge is running
                        >
                            Purge Old Notifications
                        </button>
                    </div>
                    {/* --- End Purge Card --- */}

                    {/* Removed Cleanup and Reset cards */}

                </div>
            </div>

            {/* User Management Modal */}
            {isUserModalOpen && (
                <ManageUsersModal
                    token={token}
                    currentUser={currentUser}
                    onClose={() => setIsUserModalOpen(false)}
                />
            )}

            {/* Removed Generic Confirmation Modal */}

            {/* --- Purge Notifications Modal --- */}
            {isPurgeModalOpen && (
                <div className={styles.modalOverlay} onClick={closePurgeModal}>
                    <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                        <button onClick={closePurgeModal} className={styles.closeButton} disabled={isProcessingPurge}><FaTimes /></button>
                        <h3>Purge Old Notifications</h3>
                        <p>This will permanently delete all notifications older than the specified number of days. This action cannot be undone.</p>

                        <div className={styles.purgeInputGroup}>
                            <label htmlFor="purgeDaysInput">Delete notifications older than:</label>
                            <input
                                type="number"
                                id="purgeDaysInput"
                                className={styles.purgeInput}
                                value={purgeDays}
                                onChange={(e) => setPurgeDays(e.target.value)}
                                min="1"
                                disabled={isProcessingPurge}
                            />
                            <span>days</span>
                        </div>

                        {/* Display Error inside this modal */}
                        {purgeError && (
                            <p className={styles.modalError}>
                                <FaExclamationCircle/> {purgeError}
                            </p>
                        )}

                        <div className={styles.modalActions}>
                            <button onClick={closePurgeModal} className={styles.cancelButton} disabled={isProcessingPurge}>
                                Cancel
                            </button>
                            <button onClick={handlePurgeNotifications} className={`${styles.confirmDeleteButton} ${styles.dangerButton}`} disabled={isProcessingPurge}>
                                {isProcessingPurge ? <FaSpinner className={styles.spinner} /> : <><FaTrash /> Confirm Purge</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* --- End Purge Modal --- */}
        </>
    );
};

export default SuperAdminPage;