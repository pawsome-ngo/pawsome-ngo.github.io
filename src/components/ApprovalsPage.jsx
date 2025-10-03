import React, { useState, useEffect } from 'react';
import styles from './ApprovalsPage.module.css';
import { FaSpinner, FaCheck, FaTimes, FaUserSlash, FaPhone, FaMapMarkerAlt, FaCar, FaHome, FaFirstAid } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// A simple confirmation modal
const ConfirmationModal = ({ onConfirm, onCancel, message }) => (
    <div className={styles.modalOverlay}>
        <div className={styles.modalContent}>
            <p>{message}</p>
            <div className={styles.modalActions}>
                <button onClick={onCancel} className={styles.cancelButton}>Cancel</button>
                <button onClick={onConfirm} className={styles.confirmButton}>Confirm</button>
            </div>
        </div>
    </div>
);

const ApprovalsPage = ({ token }) => {
    const [pendingUsers, setPendingUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showConfirm, setShowConfirm] = useState(null); // Will hold the user ID

    const fetchPendingUsers = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/pending-users`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Could not fetch pending users.');
            const data = await response.json();
            setPendingUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingUsers();
    }, [token]);

    const handleAuthorize = async (userId) => {
        setPendingUsers(prev => prev.filter(user => user.userId !== userId));
        await fetch(`${API_BASE_URL}/api/admin/authorize/${userId}`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` },
        });
    };

    const handleDeny = async (userId) => {
        setShowConfirm(null); // Close the modal
        setPendingUsers(prev => prev.filter(user => user.userId !== userId));
        await fetch(`${API_BASE_URL}/api/admin/deny/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` },
        });
    };

    if (loading) return <div className={styles.container}><div className={styles.centered}><FaSpinner className={styles.spinner} /></div></div>;
    if (error) return <div className={styles.container}><p className={styles.error}>{error}</p></div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1>Approvals Dashboard</h1>
                <p>Review and manage new volunteer sign-ups.</p>
            </header>

            {pendingUsers.length === 0 ? (
                <div className={styles.emptyState}>
                    <FaUserSlash />
                    <h2>No Pending Approvals</h2>
                    <p>There are currently no new users awaiting authorization.</p>
                </div>
            ) : (
                <div className={styles.userGrid}>
                    {pendingUsers.map(user => (
                        <div key={user.userId} className={styles.userCard}>
                            <div className={styles.cardHeader}>
                                <h3>{user.firstName} {user.lastName}</h3>
                                <span className={styles.experienceTag}>{user.experienceLevel}</span>
                            </div>
                            <blockquote className={styles.motivation}>
                                {user.motivation || 'No motivation provided.'}
                            </blockquote>
                            <div className={styles.userDetailsGrid}>
                                <div className={styles.detailItem}>
                                    <FaPhone />
                                    <span>{user.phoneNumber}</span>
                                </div>
                                <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                                    <FaMapMarkerAlt />
                                    <span>{user.address || 'No address provided'}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <FaCar />
                                    <span>Vehicle: <strong>{user.hasVehicle ? (user.vehicleType || 'Yes') : 'No'}</strong></span>
                                </div>
                                <div className={styles.detailItem}>
                                    <FaHome />
                                    <span>Shelter: <strong>{user.canProvideShelter ? 'Yes' : 'No'}</strong></span>
                                </div>
                                <div className={`${styles.detailItem} ${styles.fullWidth}`}>
                                    <FaFirstAid />
                                    <span>First-Aid Kit: <strong>{user.hasMedicineBox ? 'Yes' : 'No'}</strong></span>
                                </div>
                            </div>
                            <div className={styles.cardActions}>
                                <button onClick={() => setShowConfirm(user.userId)} className={styles.denyButton}><FaTimes /> Deny</button>
                                <button onClick={() => handleAuthorize(user.userId)} className={styles.authorizeButton}><FaCheck /> Authorize</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showConfirm && (
                <ConfirmationModal
                    message="Are you sure you want to deny and permanently delete this user's profile?"
                    onConfirm={() => handleDeny(showConfirm)}
                    onCancel={() => setShowConfirm(null)}
                />
            )}
        </div>
    );
};

export default ApprovalsPage;