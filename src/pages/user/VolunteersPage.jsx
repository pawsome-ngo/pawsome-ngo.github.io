import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './VolunteersPage.module.css';
import { FaSpinner, FaUserCheck, FaUserClock } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const VolunteersPage = ({ token, currentUser }) => {
    const [volunteers, setVolunteers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const navigate = useNavigate();

    const fetchVolunteers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/volunteers`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error('Failed to fetch volunteers.');
            const data = await response.json();
            setVolunteers(data);
        } catch (err) { // <-- THIS IS THE CORRECTED LINE
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        if (token) {
            fetchVolunteers();
        }
    }, [token, fetchVolunteers]);

    if (loading) return <div className={styles.container}><div className={styles.centered}><FaSpinner className={styles.spinner} /></div></div>;
    if (error) return <div className={styles.container}><p className={styles.error}>{error}</p></div>;

    return (
        <>
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1>Our Volunteers</h1>
                    <p>A dedicated team ready to make a difference.</p>
                </header>
                <div className={styles.userGrid}>
                    {volunteers.map(user => (
                        <div key={user.id} className={styles.userCard} onClick={() => navigate(`/volunteer/${user.id}`)}>
                            <div className={`${styles.statusIndicator} ${styles[(user.availabilityStatus || 'unavailable').toLowerCase()]}`}>
                                {user.availabilityStatus === 'Available' ? <FaUserCheck /> : <FaUserClock />}
                            </div>
                            <div className={styles.userInfo}>
                                <h3>{user.fullName}</h3>
                                <p className={styles.positionTag}>{(user.position || 'MEMBER').replace(/_/g, ' ')}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {selectedUser && (
                <VolunteerProfileModal
                    user={selectedUser}
                    token={token}
                    currentUser={currentUser}
                    onClose={() => setSelectedUser(null)}
                    onUpdate={() => {
                        setSelectedUser(null);
                        fetchVolunteers();
                    }}
                />
            )}
        </>
    );
};

export default VolunteersPage;