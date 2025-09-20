import React, { useState, useEffect } from 'react';
import styles from './AdminPage.module.css';
import { FaSpinner, FaCheck, FaTimes, FaUserSlash } from 'react-icons/fa';

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

const AdminPage = ({ token }) => {
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
                <h1>Admin Dashboard</h1>
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
                                <span>{user.experienceLevel}</span>
                            </div>
                            <p className={styles.motivation}>"{user.motivation || 'No motivation provided.'}"</p>
                            <div className={styles.userDetails}>
                                <p><strong>Phone:</strong> {user.phoneNumber}</p>
                                <p><strong>Address:</strong> {user.address || 'N/A'}</p>
                                <p><strong>Vehicle:</strong> {user.hasVehicle ? (user.vehicleType || 'Yes') : 'No'}</p>
                                <p><strong>Shelter:</strong> {user.canProvideShelter ? 'Yes' : 'No'}</p>
                                <p><strong>First-Aid:</strong> {user.hasMedicineBox ? 'Yes' : 'No'}</p>
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

export default AdminPage;