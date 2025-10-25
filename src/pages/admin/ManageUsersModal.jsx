import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './SuperAdminPage.module.css';
// Import necessary icons
import { FaPaw, FaTrash, FaSpinner, FaBell, FaBellSlash, FaExclamationTriangle, FaTimes, FaCheckCircle, FaExclamationCircle, FaKey } from 'react-icons/fa';
import ConfirmationModal from '../../components/common/ConfirmationModal.jsx'; // Reuse for password reset confirmation

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Helper function to format roles
const formatRoles = (roles) => {
    return roles?.map(role => role.replace('ROLE_', '').replace('_', ' ')).join(', ') || 'None';
};

const ManageUsersModal = ({ token, currentUser, onClose }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUserIds, setSelectedUserIds] = useState(new Set());
    const [showFinalConfirm, setShowFinalConfirm] = useState(false); // For delete confirmation
    const [notifyOnDelete, setNotifyOnDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deletionResult, setDeletionResult] = useState(null);

    // State for Password Reset
    const [isResetting, setIsResetting] = useState(false); // Tracks the API call
    const [userToReset, setUserToReset] = useState(null); // Stores the user object {userId, username} for confirmation
    const [resetFeedback, setResetFeedback] = useState({ message: '', type: '' }); // For success/error message display

    // Fetch user list
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        setDeletionResult(null);
        setResetFeedback({ message: '', type: '' }); // Clear reset feedback on refresh
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.message || 'Failed to fetch user list.');
            }
            const data = await response.json();
            setUsers(data);
            setSelectedUserIds(new Set()); // Clear selection on refresh
            setShowFinalConfirm(false);
        } catch (err) {
            setError(err.message || 'Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Handle user selection for deletion
    const handleCheckboxChange = (userId) => {
        setSelectedUserIds(prev => {
            const newSelection = new Set(prev);
            if (newSelection.has(userId)) {
                newSelection.delete(userId);
            } else {
                newSelection.add(userId);
            }
            return newSelection;
        });
        // Clear feedback when selection changes
        setDeletionResult(null);
        setError(null);
        setResetFeedback({ message: '', type: '' });
        setShowFinalConfirm(false);
    };

    // --- Deletion Handlers ---
    const handleOpenFinalConfirm = () => {
        if (selectedUserIds.size === 0) {
            setError("Please select at least one user to delete.");
            return;
        }
        setError(null);
        setResetFeedback({ message: '', type: '' }); // Clear other feedback
        setNotifyOnDelete(false); // Reset notification option
        setShowFinalConfirm(true);
    };

    const executeDeleteUsers = async () => {
        if (selectedUserIds.size === 0) return;
        setIsDeleting(true);
        setDeletionResult(null);
        setError(null);
        setResetFeedback({ message: '', type: '' });

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/users/batch`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userIds: Array.from(selectedUserIds),
                    notifyUsers: notifyOnDelete,
                }),
            });
            const resultData = await response.json();
            if (!response.ok) {
                throw new Error(resultData.message || 'Batch deletion failed.');
            }
            setDeletionResult(resultData); // Store the result { deleted: [...], skipped: [...] }
            fetchUsers(); // Refresh the list after deletion
        } catch (err) {
            setError(err.message || 'An error occurred during deletion.');
        } finally {
            setIsDeleting(false);
            setShowFinalConfirm(false); // Close confirmation step
            // Keep deletionResult visible until next action
        }
    };
    // --- End Deletion Handlers ---


    // --- Password Reset Handlers ---
    const handleOpenResetConfirm = (e, user) => {
        e.stopPropagation(); // Prevent row selection when clicking button
        if (isDeleting || isResetting || showFinalConfirm) return; // Prevent action during other operations
        setResetFeedback({ message: '', type: '' }); // Clear old feedback
        setError(null); // Clear main error
        setUserToReset(user); // Set the user object for the confirmation modal
    };

    const executePasswordReset = async () => {
        if (!userToReset) return;

        setIsResetting(true);
        setResetFeedback({ message: '', type: '' });
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/users/${userToReset.userId}/reset-password`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
            });

            const resultData = await response.json().catch(() => ({}));

            if (!response.ok) {
                throw new Error(resultData.message || `Failed to reset password (Status: ${response.status})`);
            }

            // Show success message
            setResetFeedback({ message: resultData.message || `Password for @${userToReset.username} reset to 'pawsome'.`, type: 'success' });

        } catch (err) {
            // Show error message
            setResetFeedback({ message: err.message || "An error occurred during password reset.", type: 'error' });
        } finally {
            setIsResetting(false);
            setUserToReset(null); // Close the confirmation modal
            // Auto-clear feedback message after a delay
            setTimeout(() => setResetFeedback({ message: '', type: '' }), 5000);
        }
    };
    // --- End Password Reset Handlers ---


    // Render individual user item in the list
    const renderUserItem = (user) => {
        const isSelected = selectedUserIds.has(user.userId);
        return (
            <div
                key={user.userId}
                className={`${styles.userListItem} ${isSelected ? styles.selected : ''}`}
                // Allow clicking row to toggle checkbox, unless delete confirm is shown
                onClick={showFinalConfirm ? undefined : () => handleCheckboxChange(user.userId)}
            >
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleCheckboxChange(user.userId)}
                    // Disable checkbox during operations or if delete confirm is shown and this row isn't selected
                    disabled={isDeleting || (showFinalConfirm && !isSelected) || isResetting}
                    aria-label={`Select user ${user.username}`}
                    onClick={(e) => e.stopPropagation()} // Prevent row click when clicking checkbox directly
                />
                <div className={styles.userInfoSmall}>
                    <span>{user.firstName} {user.lastName} (@{user.username})</span>
                    <span className={styles.userIdSmall}>ID: {user.userId}</span>
                </div>

                {/* Reset Password Button */}
                <button
                    className={styles.resetPasswordButton}
                    title={`Reset password for ${user.username}`}
                    // Open confirmation modal on click
                    onClick={(e) => handleOpenResetConfirm(e, user)}
                    // Disable button during operations
                    disabled={isDeleting || isResetting || showFinalConfirm}
                >
                    <FaKey />
                </button>
            </div>
        );
    }

    // Close modal handler, prevents closing during operations
    const handleClose = () => {
        if (isDeleting || isResetting) return;
        onClose();
    }

    return (
        <> {/* Use Fragment to allow ConfirmationModal outside the main modal structure */}
            <div className={styles.modalOverlay} onClick={handleClose}>
                <div className={`${styles.modalContent} ${styles.manageUsersModal}`} onClick={(e) => e.stopPropagation()}>
                    <button onClick={handleClose} className={styles.closeButton} disabled={isDeleting || isResetting}><FaTimes /></button>
                    <h2>Manage Users</h2>

                    {loading && (
                        <div className={styles.loadingContainerModal}>
                            <div className={styles.pawSpinner}><FaPaw className={styles.pawIcon}/></div>
                            <p>Loading Users...</p>
                        </div>
                    )}

                    {/* Display General Errors (fetch, delete selection) */}
                    {error && !loading && !deletionResult && (
                        <p className={`${styles.message} ${styles.error}`}>
                            <FaExclamationCircle/> {error}
                        </p>
                    )}

                    {/* Display Password Reset Feedback */}
                    {resetFeedback.message && (
                        <div className={`${styles.feedbackBox} ${styles[resetFeedback.type]}`}>
                            {resetFeedback.type === 'success' ? <FaCheckCircle /> : <FaExclamationTriangle />}
                            {resetFeedback.message}
                        </div>
                    )}

                    {/* Display Deletion Result */}
                    {deletionResult && (
                        <div className={styles.deletionResult}>
                            <h4>Deletion Summary:</h4>
                            {deletionResult.deleted?.length > 0 && (
                                <p className={styles.success}>
                                    <FaCheckCircle/> Successfully deleted {deletionResult.deleted.length} user(s): {deletionResult.deleted.map(u => `@${u.username || u.userId}`).join(', ')}
                                </p>
                            )}
                            {deletionResult.skipped?.length > 0 && (
                                <>
                                    <p className={styles.warning}><FaExclamationTriangle/> Skipped {deletionResult.skipped.length} user(s):</p>
                                    <ul className={styles.skippedList}>
                                        {deletionResult.skipped.map((u, index) => (
                                            <li key={index}>@{u.username || u.userId}: {u.reason}</li>
                                        ))}
                                    </ul>
                                </>
                            )}
                            <button onClick={fetchUsers} className={styles.clearResultButton}>Refresh List</button>
                        </div>
                    )}

                    {/* User List */}
                    {!loading && users.length > 0 && !deletionResult && (
                        <>
                            <p className={styles.instructionText}>
                                {showFinalConfirm
                                    ? `Confirm deletion for the selected ${selectedUserIds.size} user(s). This action is permanent.`
                                    : `Select users to delete or click the key icon (🔑) to reset a password to 'pawsome'.`}
                            </p>
                            <div className={styles.userSelectionList}>
                                {users.map(renderUserItem)}
                            </div>
                        </>
                    )}

                    {/* No Users Message */}
                    {!loading && users.length === 0 && !error && !deletionResult && (
                        <p>No other users found in the system.</p>
                    )}

                    {/* Footer Actions */}
                    {!loading && users.length > 0 && !deletionResult && (
                        <div className={styles.modalFooter}>
                            {showFinalConfirm && (
                                <label className={styles.notifyCheckboxLabel}>
                                    <input
                                        type="checkbox"
                                        checked={notifyOnDelete}
                                        onChange={(e) => setNotifyOnDelete(e.target.checked)}
                                        disabled={isDeleting}
                                    />
                                    Notify remaining users?
                                </label>
                            )}
                            <button onClick={showFinalConfirm ? () => { setShowFinalConfirm(false); setError(null); } : handleClose} className={styles.cancelButton} disabled={isDeleting || isResetting}>
                                {showFinalConfirm ? 'Back' : 'Close'}
                            </button>
                            {!showFinalConfirm ? (
                                <button
                                    onClick={handleOpenFinalConfirm}
                                    className={styles.actionButton}
                                    disabled={selectedUserIds.size === 0 || loading || isDeleting || isResetting}
                                >
                                    <FaTrash /> Delete Selected ({selectedUserIds.size})
                                </button>
                            ) : (
                                <button
                                    onClick={executeDeleteUsers}
                                    className={styles.confirmDeleteButton} // Uses danger color
                                    disabled={selectedUserIds.size === 0 || loading || isDeleting || isResetting}
                                >
                                    {isDeleting ? <FaSpinner className={styles.spinner}/> : `Confirm Delete (${selectedUserIds.size})`}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Confirmation Modal for Password Reset */}
            {userToReset && (
                <ConfirmationModal
                    // Dynamic message including username
                    message={`Are you sure you want to reset the password for @${userToReset.username}? Their new password will be 'pawsome'.`}
                    confirmText={isResetting ? "Resetting..." : "Yes, Reset Password"}
                    confirmClass="delete" // Use the red button style for confirmation
                    onConfirm={executePasswordReset}
                    onCancel={() => setUserToReset(null)} // Close modal on cancel
                    confirmDisabled={isResetting}
                    cancelDisabled={isResetting}
                />
            )}
        </>
    );
};

export default ManageUsersModal;