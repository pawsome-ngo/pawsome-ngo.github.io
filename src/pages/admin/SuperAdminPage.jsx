// File: src/pages/admin/SuperAdminPage.jsx
import React, { useState, useEffect, useCallback } from 'react'; // Added useEffect and useCallback
import styles from './SuperAdminPage.module.css';
import ManageUsersModal from './ManageUsersModal.jsx';
import ConfirmationModal from '../../components/common/ConfirmationModal.jsx';
// --- ✨ Import FaRedo for the Reset button ---
import { FaUsersCog, FaBellSlash, FaTrash, FaSpinner, FaPaw, FaExclamationTriangle, FaCheckCircle, FaTimes, FaRedo, FaExclamationCircle } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const SuperAdminPage = ({ token, currentUser }) => {
    const [isUserModalOpen, setIsUserModalOpen] = useState(false);
    // --- ✨ Updated state for generic confirmation ---
    const [actionToConfirm, setActionToConfirm] = useState(null); // 'purgeNotifications', 'resetKeepUsers'
    const [isProcessing, setIsProcessing] = useState(false); // Generic processing flag
    // --- End Update ---
    const [feedback, setFeedback] = useState({ message: '', type: '' }); // type: 'success' or 'error'

    // State for Purge Modal fields
    const [purgeDays, setPurgeDays] = useState("7");
    // Removed purgeError state

    // Basic check
    if (!currentUser?.roles?.includes('ROLE_SUPER_ADMIN')) {
        return (
            <div className={styles.container}>
                <p className={styles.error}>Unauthorized access. You must be a Super Admin to view this page.</p>
            </div>
        );
    }

    // --- ✨ Generic Confirmation Handler (Handles Purge and Reset) ---
    const handleActionConfirm = async () => {
        if (!actionToConfirm) return;

        setIsProcessing(true);
        setFeedback({ message: '', type: '' });
        let endpoint = '';
        let successMessage = '';
        let errorMessage = '';
        let httpMethod = 'DELETE';

        switch (actionToConfirm) {
            case 'purgeNotifications':
                const days = parseInt(purgeDays, 10);
                if (isNaN(days) || days <= 0) {
                    setFeedback({ message: "Invalid number of days for purge.", type: 'error' });
                    setIsProcessing(false);
                    setActionToConfirm(null);
                    setTimeout(() => setFeedback({ message: '', type: '' }), 5000);
                    return;
                }
                endpoint = `${API_BASE_URL}/api/notifications/older-than/${days}`;
                successMessage = `Successfully purged notifications older than ${days} days.`;
                errorMessage = 'Failed to purge notifications.';
                break;
            // --- ✨ Added Case for Reset ---
            case 'resetKeepUsers':
                endpoint = `${API_BASE_URL}/api/admin/reset-application-keep-users`;
                successMessage = 'Application data reset successfully, keeping users and roles.';
                errorMessage = 'Failed to reset application data.';
                break;
            // --- End Added Case ---
            default:
                setIsProcessing(false);
                setActionToConfirm(null);
                return;
        }

        try {
            const response = await fetch(endpoint, {
                method: httpMethod,
                headers: { 'Authorization': `Bearer ${token}` },
            });
            const resultData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(resultData.message || errorMessage || `Action failed (Status: ${response.status})`);
            }

            setFeedback({ message: resultData.message || successMessage, type: 'success' });

        } catch (err) {
            setFeedback({ message: err.message || 'An unexpected error occurred.', type: 'error' });
        } finally {
            setIsProcessing(false);
            setActionToConfirm(null); // Close confirmation modal after action
            setTimeout(() => setFeedback({ message: '', type: '' }), 5000); // Auto-clear feedback
        }
    };

    const getConfirmationMessage = () => {
        switch (actionToConfirm) {
            case 'purgeNotifications':
                return `Are you sure you want to permanently delete all notifications older than ${purgeDays} days? This cannot be undone.`;
            // --- ✨ Added Message for Reset ---
            case 'resetKeepUsers':
                return "Are you ABSOLUTELY sure you want to reset the application? This will delete ALL incidents, cases, chats, inventory, etc., but keep user accounts and roles. This cannot be undone.";
            // --- End Added Message ---
            default: return "Are you sure?";
        }
    };
    // --- End Generic Handler ---

    // --- Handler to open Purge Confirmation ---
    const handleOpenPurgeConfirm = () => {
        const days = parseInt(purgeDays, 10);
        if (isNaN(days) || days <= 0) {
            setFeedback({ message: "Please enter a valid number of days (1 or more) to purge.", type: 'error' });
            setTimeout(() => setFeedback({ message: '', type: '' }), 5000);
            return;
        }
        setActionToConfirm('purgeNotifications'); // Set state to open the generic confirmation modal
    }
    // --- End Handler ---

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
                            disabled={isProcessing}
                        >
                            Open User Manager
                        </button>
                    </div>

                    {/* Purge Notifications Card */}
                    <div className={`${styles.actionCard} ${styles.dangerZone}`}>
                        <FaBellSlash className={styles.actionIcon} />
                        <h2>Purge Notifications</h2>
                        <p>Permanently delete old notifications to clean up the database.</p>
                        <div className={styles.purgeInputGroupCard}>
                            <label htmlFor="purgeDaysInputCard">Older than:</label>
                            <input
                                type="number"
                                id="purgeDaysInputCard"
                                className={styles.purgeInput}
                                value={purgeDays}
                                onChange={(e) => setPurgeDays(e.target.value)}
                                min="1"
                                disabled={isProcessing}
                            />
                            <span>days</span>
                        </div>
                        <button
                            className={`${styles.actionButton} ${styles.dangerButton}`}
                            onClick={handleOpenPurgeConfirm}
                            disabled={isProcessing}
                        >
                            Purge Notifications
                        </button>
                    </div>

                    {/* --- ✨ Reset Application (Keep Users) Card --- */}
                    <div className={`${styles.actionCard} ${styles.dangerZone}`}>
                        <FaRedo className={styles.actionIcon} />
                        <h2>Reset Application (Keep Users)</h2>
                        <p>Deletes all incidents, cases, chats, inventory, etc., but keeps user accounts and roles. Use with extreme caution!</p>
                        <button
                            className={`${styles.actionButton} ${styles.dangerButton}`}
                            onClick={() => setActionToConfirm('resetKeepUsers')} // Opens confirmation modal
                            disabled={isProcessing}
                        >
                            Reset Application Data
                        </button>
                    </div>
                    {/* --- End Reset Card --- */}
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

            {/* --- Generic Confirmation Modal (Handles Purge and Reset) --- */}
            {actionToConfirm && (
                <ConfirmationModal
                    message={getConfirmationMessage()}
                    confirmText={isProcessing ? "Processing..." : "Confirm"}
                    confirmClass="delete" // Use red confirm button
                    onConfirm={handleActionConfirm}
                    onCancel={() => setActionToConfirm(null)}
                    confirmDisabled={isProcessing}
                    cancelDisabled={isProcessing}
                />
            )}
            {/* --- End Confirmation Modal --- */}
        </>
    );
};

export default SuperAdminPage;