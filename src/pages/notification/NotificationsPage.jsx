import React, { useState, useEffect, useCallback } from 'react';
import styles from './NotificationsPage.module.css'; // Create this CSS file
import NotificationItem from './NotificationItem.jsx'; // Create this component
// --- ✨ Import FaTrash and ConfirmationModal ---
import { FaPaw, FaEnvelopeOpenText, FaInbox, FaTrash } from 'react-icons/fa';
import ConfirmationModal from '../../components/common/ConfirmationModal.jsx'; // Adjust path if needed
// --- End Imports ---

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const NotificationsPage = ({ token }) => {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all'); // 'all' or 'unread'

    // --- ✨ State for Confirmation Modals ---
    const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
    const [notificationToDelete, setNotificationToDelete] = useState(null); // Stores ID for single delete confirm
    // --- End State ---


    const fetchNotifications = useCallback(async (currentFilter) => {
        if (!token) {
            setError("Token not found. Please log in.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        const unreadOnly = currentFilter === 'unread';
        const url = `${API_BASE_URL}/api/notifications?unreadOnly=${unreadOnly}`;

        try {
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch notification.');
            }
            const data = await response.json();
            setNotifications(data);
        } catch (err) {
            setError(err.message || 'Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    }, [token]); // useCallback dependency

    useEffect(() => {
        fetchNotifications(filter);
    }, [filter, fetchNotifications]); // Use fetchNotifications from useCallback

    const handleMarkRead = useCallback(async (notificationId) => {
        // Optimistically update UI
        setNotifications(prev => prev.map(n =>
            n.id === notificationId ? { ...n, isRead: true } : n
        ));

        try {
            await fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            // Optional: Refetch if optimistic update isn't sufficient or for confirmation
            // await fetchNotifications(filter);
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
            // Revert optimistic update on error
            setNotifications(prev => prev.map(n =>
                n.id === notificationId ? { ...n, isRead: false } : n
            ));
            setError("Failed to update notification status.");
        }
    }, [token, filter, fetchNotifications]); // Include filter & fetchNotifications

    const handleMarkAllRead = async () => {
        // Optimistically update all visible notification
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setError(''); // Clear previous errors

        try {
            const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) {
                throw new Error('Failed to mark all as read.');
            }
            // Refetch to ensure consistency, especially if filtering by unread
            await fetchNotifications(filter);
        } catch (err) {
            console.error("Failed to mark all as read:", err);
            setError("Failed to mark all notification as read.");
            // Revert optimistic update on error (could refetch instead)
            await fetchNotifications(filter);
        }
    };

    // --- ✨ Handler for Single Delete ---
    const handleDeleteNotification = useCallback(async (notificationId) => {
        setNotificationToDelete(null); // Close confirm modal if open
        // Optimistically remove from UI
        const originalNotifications = [...notifications];
        setNotifications(prev => prev.filter(n => n.id !== notificationId));
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/notifications/${notificationId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete notification.');
            }
            // Success - UI already updated
        } catch (err) {
            console.error("Failed to delete notification:", err);
            setError(err.message || "Failed to delete notification.");
            // Revert optimistic update on error
            setNotifications(originalNotifications);
        }
    }, [token, notifications]); // Added notification to dependency array for optimistic revert
    // --- End Handler ---

    // --- ✨ Handler for Delete All ---
    const handleDeleteAllNotifications = async () => {
        setShowDeleteAllConfirm(false); // Close confirm modal
        const originalNotifications = [...notifications];
        setNotifications([]); // Optimistically clear UI
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/notifications/all`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to delete all notification.');
            }
            // Success - UI already cleared
            // Optionally refetch to confirm empty state from backend if desired
            // await fetchNotifications(filter);
        } catch (err) {
            console.error("Failed to delete all notification:", err);
            setError(err.message || "Failed to delete all notification.");
            // Revert optimistic update on error
            setNotifications(originalNotifications);
        }
    };
    // --- End Handler ---

    const hasNotifications = notifications.length > 0;
    const hasUnread = notifications.some(n => !n.isRead);

    return (
        <> {/* Fragment needed for modals */}
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1>Notifications</h1>
                    <div className={styles.controls}>
                        {/* Filter Buttons */}
                        <button
                            onClick={() => setFilter('all')}
                            className={filter === 'all' ? styles.activeFilter : ''}
                        > All </button>
                        <button
                            onClick={() => setFilter('unread')}
                            className={filter === 'unread' ? styles.activeFilter : ''}
                        > Unread </button>
                        {/* Action Buttons */}
                        <button
                            onClick={handleMarkAllRead}
                            disabled={!hasUnread || loading}
                            className={styles.markAllButton}
                            title="Mark all as read"
                        > <FaEnvelopeOpenText /> Mark all read </button>
                        {/* --- ✨ Delete All Button --- */}
                        <button
                            onClick={() => setShowDeleteAllConfirm(true)}
                            disabled={!hasNotifications || loading}
                            className={styles.deleteAllButton}
                            title="Delete all notifications"
                        > <FaTrash /> Delete All </button>
                        {/* --- End Button --- */}
                    </div>
                </header>

                {loading && (
                    <div className={styles.loadingContainer}>
                        <div className={styles.pawSpinner}>
                            <FaPaw className={styles.pawIcon} />
                        </div>
                        <p>Loading Notifications...</p>
                    </div>
                )}

                {error && <p className={styles.error}>{error}</p>}

                {!loading && !error && !hasNotifications && (
                    <div className={styles.emptyState}>
                        <FaInbox />
                        <h2>No Notifications</h2>
                        <p>You currently have no {filter === 'unread' ? 'unread ' : ''}notifications.</p>
                    </div>
                )}

                {!loading && !error && hasNotifications && (
                    <div className={styles.notificationList}>
                        {notifications.map(notification => (
                            <NotificationItem
                                key={notification.id}
                                notification={notification}
                                onMarkRead={handleMarkRead}
                                // --- ✨ Pass delete handler ---
                                onDelete={() => setNotificationToDelete(notification.id)} // Open confirmation modal
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* --- ✨ Confirmation Modals --- */}
            {showDeleteAllConfirm && (
                <ConfirmationModal
                    message="Are you sure you want to delete ALL your notifications? This cannot be undone."
                    confirmText="Delete All"
                    confirmClass="delete" // Optional class for red button
                    onConfirm={handleDeleteAllNotifications}
                    onCancel={() => setShowDeleteAllConfirm(false)}
                />
            )}
            {notificationToDelete !== null && (
                <ConfirmationModal
                    message="Are you sure you want to delete this notification?"
                    confirmText="Delete"
                    confirmClass="delete"
                    onConfirm={() => handleDeleteNotification(notificationToDelete)}
                    onCancel={() => setNotificationToDelete(null)}
                />
            )}
            {/* --- End Modals --- */}
        </>
    );
};

export default NotificationsPage;