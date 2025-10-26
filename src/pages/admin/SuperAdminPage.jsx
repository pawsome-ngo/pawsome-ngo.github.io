import React, { useState, useEffect } from 'react';
import styles from './SuperAdminPage.module.css'; // Your existing CSS module
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import ManageUsersModal from './ManageUsersModal'; // Assuming this exists
import ConfirmationModal from '../../components/common/ConfirmationModal'; // Use a generic confirmation
import { FaUsers, FaTrashAlt, FaComments, FaUsersCog, FaBellSlash, FaSpinner, FaPaw, FaExclamationTriangle, FaCheckCircle, FaTimes, FaRedo, FaExclamationCircle, FaKey } from 'react-icons/fa'; // Import all icons used

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const SuperAdminPage = ({ token, currentUser, onLogout }) => { // Added onLogout from props
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isManageUsersModalOpen, setIsManageUsersModalOpen] = useState(false);
    const navigate = useNavigate();

    // State for the new Clear Chat feature
    const [messagesToKeep, setMessagesToKeep] = useState(100); // Default value
    const [isClearing, setIsClearing] = useState(false);
    const [clearChatResult, setClearChatResult] = useState(null); // To show success/error
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    // State from ManageUsers (adapted, assuming currentUser is passed in)
    const [actionToConfirm, setActionToConfirm] = useState(null); // 'purgeNotifications', 'resetKeepUsers'
    const [isProcessing, setIsProcessing] = useState(false); // Generic processing flag
    const [feedback, setFeedback] = useState({ message: '', type: '' }); // type: 'success' or 'error'

    // State for Purge Modal fields
    const [purgeDays, setPurgeDays] = useState("7");

    useEffect(() => {
        if (token) {
            try {
                const decoded = jwtDecode(token);
                const roles = decoded.roles || [];
                // Check if user has SUPER_ADMIN role
                if (roles.includes('ROLE_SUPER_ADMIN')) {
                    setIsAdmin(true);
                } else {
                    console.warn("Redirecting: User does not have ROLE_SUPER_ADMIN");
                    navigate('/'); // Redirect if not super admin
                }
            } catch (error) {
                console.error("Token decoding failed:", error);
                onLogout(); // Log out on bad token
                navigate('/login');
            }
        } else {
            console.warn("Redirecting: No token found");
            navigate('/login'); // Redirect if no token
        }
        setLoading(false);
    }, [token, navigate, onLogout]); // Added onLogout dependency

    const handleOpenManageUsers = () => {
        setIsManageUsersModalOpen(true);
    };

    const handleCloseManageUsers = () => {
        setIsManageUsersModalOpen(false);
    };

    // --- Chat Clearing Handlers ---
    const handleClearChatConfirm = () => {
        if (messagesToKeep < 0) {
            setClearChatResult({ success: false, message: 'Number to keep must be 0 or more.' });
            setTimeout(() => setClearChatResult(null), 5000);
            return;
        }
        setShowClearConfirm(true); // Show confirmation modal
    };

    const handleClearChatAction = async () => {
        setShowClearConfirm(false); // Close confirmation modal
        setIsClearing(true);
        setClearChatResult(null); // Clear previous result
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/clear-global-chat?keep=${messagesToKeep}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            let result;
            try {
                result = await response.json();
            } catch (jsonError) {
                console.error("Failed to parse JSON response:", jsonError);
                if (!response.ok) {
                    throw new Error(response.statusText || `HTTP error! status: ${response.status}`);
                } else {
                    result = { message: "Operation completed, but response format was unexpected." };
                }
            }

            if (!response.ok) {
                throw new Error(result.error || `HTTP error! status: ${response.status}`);
            }

            setClearChatResult({ success: true, message: `Successfully deleted ${result.messages_deleted} messages.` });

        } catch (error) {
            console.error("Error clearing global chat:", error);
            setClearChatResult({ success: false, message: error.message || 'Failed to clear chat.' });
        } finally {
            setIsClearing(false);
            setTimeout(() => setClearChatResult(null), 5000); // Clear after 5 seconds
        }
    };
    // --- End Chat Clearing Handlers ---

    // --- Generic Confirmation Handler (For Purge and Reset) ---
    const handleActionConfirm = async () => {
        if (!actionToConfirm) return;

        setIsProcessing(true);
        setFeedback({ message: '', type: '' });
        let endpoint = '';
        let successMessage = '';
        let errorMessage = '';
        let httpMethod = 'DELETE'; // Default

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
                httpMethod = 'DELETE';
                break;
            case 'resetKeepUsers':
                endpoint = `${API_BASE_URL}/api/admin/reset-application-keep-users`;
                successMessage = 'Application data reset successfully, keeping users and roles.';
                errorMessage = 'Failed to reset application data.';
                httpMethod = 'DELETE'; // This is also a destructive action
                break;
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
            case 'resetKeepUsers':
                return "Are you ABSOLUTELY sure you want to reset the application? This will delete ALL incidents, cases, chats, inventory, etc., but keep user accounts and roles. This cannot be undone.";
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

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.pawSpinner}>
                    <FaPaw className={styles.pawIcon} />
                </div>
                <p>Loading Super Admin Page...</p>
            </div>
        );
    }

    if (!isAdmin && !loading) {
        return null; // Don't render anything if not admin (should be redirected)
    }

    return (
        <>
            <div className={styles.superAdminPage}> {/* Use .superAdminPage from CSS module */}
                <header className={styles.header}>
                    <h1>Super Admin Panel</h1>
                    <p>Access high-level administrative functions.</p>
                </header>

                {/* Feedback Area for Purge/Reset */}
                {feedback.message && (
                    <div className={`${styles.feedbackBox} ${styles[feedback.type]}`}>
                        {feedback.type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
                        {feedback.message}
                    </div>
                )}

                <div className={styles.cardGrid}>
                    {/* Manage Users Card */}
                    <div className={styles.card}>
                        <h2><FaUsersCog className={styles.actionIcon} /> User Management</h2>
                        <p>View, manage roles, and delete user accounts.</p>
                        <button
                            onClick={handleOpenManageUsers}
                            className={styles.actionButton}
                            disabled={isProcessing || isClearing} // Disable if any action is running
                        >
                            <FaUsers /> Manage Users
                        </button>
                    </div>

                    {/* New Card for Clearing Global Chat */}
                    <div className={`${styles.card} ${styles.dangerZone}`}>
                        <h2><FaComments className={styles.actionIcon} /> Global Chat Management</h2>
                        <p>Clear old messages from the global chat. Enter the number of recent messages to keep (0 to clear all).</p>
                        <div className={styles.clearChatInputGroup}>
                            <label htmlFor="keepCount">Messages to Keep:</label>
                            <input
                                type="number"
                                id="keepCount"
                                value={messagesToKeep}
                                onChange={(e) => setMessagesToKeep(Math.max(0, parseInt(e.target.value) || 0))}
                                min="0"
                                className={styles.keepInput}
                                disabled={isClearing || isProcessing}
                            />
                        </div>
                        <button
                            onClick={handleClearChatConfirm}
                            className={`${styles.actionButton} ${styles.deleteButton}`}
                            disabled={isClearing || isProcessing}
                        >
                            {isClearing ? <FaSpinner className={styles.spinner} /> : <><FaTrashAlt /> Clear Old Messages</>}
                        </button>
                        {/* Feedback for chat clear */}
                        {clearChatResult && (
                            <p className={clearChatResult.success ? styles.successMessage : styles.errorMessage}>
                                {clearChatResult.message}
                            </p>
                        )}
                    </div>

                    {/* Purge Notifications Card */}
                    <div className={`${styles.card} ${styles.dangerZone}`}>
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
                                disabled={isProcessing || isClearing}
                            />
                            <span>days</span>
                        </div>
                        <button
                            className={`${styles.actionButton} ${styles.dangerButton}`}
                            onClick={handleOpenPurgeConfirm}
                            disabled={isProcessing || isClearing}
                        >
                            {isProcessing && actionToConfirm === 'purgeNotifications' ? <FaSpinner className={styles.spinner} /> : <FaTrashAlt />}
                            Purge Notifications
                        </button>
                    </div>

                    {/* Reset Application (Keep Users) Card */}
                    <div className={`${styles.card} ${styles.dangerZone}`}>
                        <FaRedo className={styles.actionIcon} />
                        <h2>Reset Application (Keep Users)</h2>
                        <p>Deletes ALL incidents, cases, chats, inventory, etc., but keeps user accounts and roles. Use with extreme caution!</p>
                        <button
                            className={`${styles.actionButton} ${styles.dangerButton}`}
                            onClick={() => setActionToConfirm('resetKeepUsers')}
                            disabled={isProcessing || isClearing}
                        >
                            {isProcessing && actionToConfirm === 'resetKeepUsers' ? <FaSpinner className={styles.spinner} /> : <FaExclamationTriangle />}
                            Reset Application Data
                        </button>
                    </div>

                </div>
            </div>

            {/* Modals */}
            {isManageUsersModalOpen && (
                <ManageUsersModal
                    token={token}
                    currentUser={currentUser} // Pass currentUser to ManageUsersModal
                    onClose={handleCloseManageUsers}
                />
            )}

            {/* Generic Confirmation Modal (Handles Purge and Reset) */}
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

            {/* Confirmation Modal for Chat Clear */}
            {showClearConfirm && (
                <ConfirmationModal
                    message={`Are you sure you want to delete all global chat messages except ${messagesToKeep === 0 ? 'all of them' : `the last ${messagesToKeep}` }? This action cannot be undone.`}
                    confirmText={isClearing ? "Clearing..." : "Yes, Clear Messages"}
                    cancelText="Cancel"
                    onConfirm={handleClearChatAction}
                    onCancel={() => setShowClearConfirm(false)}
                    confirmButtonStyle="danger" // Apply danger styling
                    confirmDisabled={isClearing}
                    cancelDisabled={isClearing}
                />
            )}
        </>
    );
};

export default SuperAdminPage;