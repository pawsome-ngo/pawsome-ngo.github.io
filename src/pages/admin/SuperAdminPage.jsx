import React, { useState, useEffect } from 'react';
import styles from './SuperAdminPage.module.css'; // Your existing CSS module
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';
import ManageUsersModal from './ManageUsersModal'; // Assuming this exists
import ConfirmationModal from '../../components/common/ConfirmationModal'; // Use a generic confirmation
import { FaUsers, FaTrashAlt, FaComments } from 'react-icons/fa'; // Import icons

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const SuperAdminPage = ({ token, onLogout }) => {
    const [isAdmin, setIsAdmin] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isManageUsersModalOpen, setIsManageUsersModalOpen] = useState(false);
    const navigate = useNavigate();

    // State for the new Clear Chat feature
    const [messagesToKeep, setMessagesToKeep] = useState(100); // Default value
    const [isClearing, setIsClearing] = useState(false);
    const [clearChatResult, setClearChatResult] = useState(null); // To show success/error
    const [showClearConfirm, setShowClearConfirm] = useState(false);


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

    // --- New Function to Handle Chat Clearing ---
    const handleClearChatConfirm = () => {
        if (messagesToKeep < 0) {
            setClearChatResult({ success: false, message: 'Number to keep must be 0 or more.' });
            // Clear the error message after a few seconds
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

            // Try to parse JSON, handle potential non-JSON responses gracefully
            let result;
            try {
                result = await response.json();
            } catch (jsonError) {
                // If parsing fails, use the status text or a generic message
                console.error("Failed to parse JSON response:", jsonError);
                if (!response.ok) {
                    throw new Error(response.statusText || `HTTP error! status: ${response.status}`);
                } else {
                    // If response was OK but not JSON (unlikely for this endpoint)
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
            // Optionally clear the success/error message after a few seconds
            setTimeout(() => setClearChatResult(null), 5000); // Clear after 5 seconds
        }
    };
    // --- End New Function ---


    if (loading) {
        return <div className={styles.loading}>Loading Super Admin Page...</div>;
    }

    // This check prevents rendering before the effect redirects non-admins
    if (!isAdmin && !loading) {
        // This component should ideally not render at all for non-admins due to redirect.
        // Returning null or a minimal placeholder is safer than showing unauthorized message briefly.
        return null;
        // return <div className={styles.unauthorized}>Access Denied. Super Admin privileges required.</div>;
    }

    return (
        <div className={styles.superAdminPage}>
            <h1>Super Admin Dashboard</h1>
            <div className={styles.cardGrid}>
                {/* Existing Card(s) */}
                <div className={styles.card}>
                    <h2><FaUsers /> User Management</h2>
                    <p>View, manage roles, and delete users.</p>
                    <button onClick={handleOpenManageUsers} className={styles.actionButton}>
                        Manage Users
                    </button>
                </div>

                {/* --- New Card for Clearing Global Chat --- */}
                <div className={styles.card}>
                    <h2><FaComments /> Global Chat Management</h2>
                    <p>Clear old messages from the global chat. Enter the number of recent messages to keep (0 to clear all).</p>
                    <div className={styles.clearChatInputGroup}>
                        <label htmlFor="keepCount">Messages to Keep:</label>
                        <input
                            type="number"
                            id="keepCount"
                            value={messagesToKeep}
                            onChange={(e) => setMessagesToKeep(Math.max(0, parseInt(e.target.value) || 0))} // Ensure non-negative integer
                            min="0"
                            className={styles.keepInput}
                            disabled={isClearing}
                        />
                    </div>
                    <button
                        onClick={handleClearChatConfirm}
                        className={`${styles.actionButton} ${styles.deleteButton}`}
                        disabled={isClearing}
                    >
                        {isClearing ? 'Clearing...' : <><FaTrashAlt /> Clear Old Messages</>}
                    </button>
                    {clearChatResult && (
                        <p className={clearChatResult.success ? styles.successMessage : styles.errorMessage}>
                            {clearChatResult.message}
                        </p>
                    )}
                </div>
                {/* --- End New Card --- */}

                {/* Add more cards for other super admin functions as needed */}

            </div>

            {isManageUsersModalOpen && (
                <ManageUsersModal
                    token={token}
                    onClose={handleCloseManageUsers}
                />
            )}

            {/* Confirmation Modal */}
            {showClearConfirm && (
                <ConfirmationModal
                    message={`Are you sure you want to delete all global chat messages except the ${messagesToKeep === 0 ? 'very last message (if any)' : `last ${messagesToKeep}` }? This action cannot be undone and includes associated media files.`}
                    confirmText="Yes, Clear Messages"
                    cancelText="Cancel"
                    onConfirm={handleClearChatAction}
                    onCancel={() => setShowClearConfirm(false)}
                    confirmButtonStyle="danger" // Apply danger styling to confirm button
                />
            )}
        </div>
    );
};

export default SuperAdminPage;