// File: src/pages/admin/ManageUsersModal.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import styles from './SuperAdminPage.module.css';
import { FaPaw, FaTrash, FaSpinner, FaBell, FaBellSlash, FaExclamationTriangle, FaTimes, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Helper to format roles
const formatRoles = (roles) => {
    return roles?.map(role => role.replace('ROLE_', '').replace('_', ' ')).join(', ') || 'None';
};

const ManageUsersModal = ({ token, currentUser, onClose }) => {
    const [users, setUsers] = useState([]); // Full user list fetched initially
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUserIds, setSelectedUserIds] = useState(new Set());
    const [showFinalConfirm, setShowFinalConfirm] = useState(false);
    const [notifyOnDelete, setNotifyOnDelete] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deletionResult, setDeletionResult] = useState(null); // To show final success/skip messages

    // Fetch users when modal opens
    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        setDeletionResult(null); // Clear previous results
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
            setSelectedUserIds(new Set()); // Reset selection on fetch/refresh
            setShowFinalConfirm(false); // Reset confirmation state
        } catch (err) {
            setError(err.message || 'Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

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
        setDeletionResult(null); // Clear previous results when selection changes
        setError(null); // Clear error when selection changes
        setShowFinalConfirm(false); // Go back to selection mode if confirming
    };

    // This button now directly opens the final confirmation step
    const handleOpenFinalConfirm = () => {
        if (selectedUserIds.size === 0) {
            setError("Please select at least one user to delete.");
            return;
        }
        setError(null); // Clear selection error if present
        setNotifyOnDelete(false); // Reset notify checkbox
        setShowFinalConfirm(true); // Open the confirmation part of the modal
    };

    // This function is now called by the *final* confirm button
    const executeDeleteUsers = async () => {
        if (selectedUserIds.size === 0) return;

        setIsDeleting(true);
        setError(null);
        setDeletionResult(null);

        try {
            // Call the combined batch delete endpoint
            const response = await fetch(`${API_BASE_URL}/api/admin/users/batch`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    userIds: Array.from(selectedUserIds), // Send all selected IDs
                    notifyUsers: notifyOnDelete
                }),
            });

            const resultData = await response.json();

            if (!response.ok) {
                // This will be caught by the catch block below
                throw new Error(resultData.message || `Failed to process deletion request (Status: ${response.status})`);
            }

            // --- ✨ CRITICAL FIX: Check the 200 OK response for SKIPPED users ---
            const skipped = resultData.details?.skipped || [];
            const deleted = resultData.details?.deleted || [];

            if (skipped.length > 0) {
                // This is the "error" you want to see.
                // We set the ERROR state, not the success/result state.
                const skippedMessages = skipped.map(s => `@${s.username || `ID: ${s.userId}`} (${s.reason})`).join(', ');
                setError(`Deletion failed for ${skipped.length} user(s): ${skippedMessages}`);

                // If some users were successfully deleted in the same batch, refresh the list
                if (deleted.length > 0) {
                    await fetchUsers(); // Refresh the list
                    // Keep modal open to show error, selection will be cleared by fetch
                }
                // Stay on the confirmation screen to show the error
                setShowFinalConfirm(true);

            } else if (deleted.length > 0) {
                // Pure success, no one was skipped
                setDeletionResult(resultData); // Show the green success box
                await fetchUsers(); // Refresh the list
                setShowFinalConfirm(false); // Go back to selection view
            } else {
                // No one deleted, no one skipped
                setError("No users were processed. Please check your selection.");
                setShowFinalConfirm(true); // Stay on confirm screen to show error
            }
            // --- End Fix ---

        } catch (err) {
            // This catches network errors or !response.ok errors
            setError(err.message || "An error occurred during deletion.");
            setDeletionResult(null); // Ensure success box is hidden
            setShowFinalConfirm(true); // Keep modal open to show the error
        } finally {
            setIsDeleting(false); // Stop loading spinner in all cases
        }
    };


    const renderUserItem = (user) => {
        const isSelected = selectedUserIds.has(user.userId);
        return (
            <div
                key={user.userId}
                className={`${styles.userListItem} ${isSelected ? styles.selected : ''}`}
                onClick={() => handleCheckboxChange(user.userId)}
            >
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleCheckboxChange(user.userId)}
                    disabled={isDeleting || (showFinalConfirm && !isSelected)} // Also disable non-selected users in confirm step
                    aria-label={`Select user ${user.username}`}
                />
                <div className={styles.userInfoSmall}>
                    <span>{user.firstName} {user.lastName} (@{user.username})</span>
                    <span className={styles.userIdSmall}>ID: {user.userId}</span>
                </div>
            </div>
        );
    }

    // On close, only close if not deleting
    const handleClose = () => {
        if (isDeleting) return;
        onClose();
    }

    return (
        <div className={styles.modalOverlay} onClick={handleClose}>
            <div className={`${styles.modalContent} ${styles.manageUsersModal}`} onClick={(e) => e.stopPropagation()}>
                <button onClick={handleClose} className={styles.closeButton} disabled={isDeleting}><FaTimes /></button>
                <h2>Manage Users</h2>

                {loading && (
                    <div className={styles.loadingContainerModal}>
                        <div className={styles.pawSpinner}><FaPaw className={styles.pawIcon} /></div>
                        <p>Loading Users...</p>
                    </div>
                )}

                {/* Display General Errors (Fetch error, selection error) OR Deletion Error */}
                {error && !loading && !deletionResult && (
                    <p className={`${styles.message} ${styles.error}`}>
                        <FaExclamationCircle/> {error}
                    </p>
                )}


                {/* Display Deletion Success/Warning Results */}
                {deletionResult && (
                    <div className={`${styles.message} ${deletionResult.details?.skipped?.length > 0 ? styles.warning : styles.success}`}>
                        {deletionResult.details?.deleted?.length > 0 && (
                            <div><FaCheckCircle /> Successfully deleted {deletionResult.details.deleted.length} user(s).</div>
                        )}
                        {deletionResult.details?.skipped?.length > 0 && (
                            <div style={{marginTop: deletionResult.details?.deleted?.length > 0 ? '0.5rem' : '0'}}>
                                <FaExclamationTriangle /> Skipped {deletionResult.details.skipped.length} user(s):
                                <ul className={styles.skippedList}>
                                    {deletionResult.details.skipped.map(skipped => (
                                        <li key={skipped.userId}>@{skipped.username || `ID: ${skipped.userId}`} ({skipped.reason})</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {/* Button to clear results and go back to fresh user list */}
                        <button onClick={() => { setDeletionResult(null); fetchUsers(); }} className={styles.clearResultButton}>OK</button>
                    </div>
                )}

                {/* User List - Hide during loading or if showing results */}
                {!loading && users.length > 0 && !deletionResult && (
                    <>
                        <p className={styles.instructionText}>
                            {showFinalConfirm
                                ? `Confirm deletion for the selected ${selectedUserIds.size} user(s). The system will skip users in active cases.`
                                : `Select users to delete.`}
                        </p>
                        <div className={styles.userSelectionList}>
                            {users.map(renderUserItem)}
                        </div>
                    </>
                )}


                {!loading && users.length === 0 && !error && !deletionResult && (
                    <p>No other users found in the system.</p>
                )}

                {/* Footer with actions - Hide during loading or if showing results */}
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
                                Notify users?
                            </label>
                        )}
                        <button onClick={showFinalConfirm ? () => { setShowFinalConfirm(false); setError(null); } : handleClose} className={styles.cancelButton} disabled={isDeleting}>
                            {showFinalConfirm ? 'Back' : 'Cancel'}
                        </button>
                        {!showFinalConfirm ? (
                            <button
                                onClick={handleOpenFinalConfirm} // Button now opens confirm step
                                className={styles.actionButton} // Style as primary action
                                disabled={selectedUserIds.size === 0 || loading || isDeleting}
                            >
                                Delete Selected Users...
                            </button>
                        ) : (
                            <button
                                onClick={executeDeleteUsers} // Button executes the delete
                                className={styles.confirmDeleteButton}
                                disabled={selectedUserIds.size === 0 || loading || isDeleting}
                            >
                                {isDeleting ? <FaSpinner className={styles.spinner}/> : `Confirm Delete (${selectedUserIds.size})`}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ManageUsersModal;