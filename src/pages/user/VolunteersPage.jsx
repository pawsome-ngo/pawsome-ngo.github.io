import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './VolunteersPage.module.css';
import { FaSpinner, FaUserCheck, FaUserClock, FaUser } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// ✨ NEW: Function to generate a unique, vibrant gradient for each card
const generateCardGradient = (index) => {
    const gradients = [
        'linear-gradient(135deg, #FFDADA, #FFECBC)', // Soft Pink-Orange
        'linear-gradient(135deg, #C2E0FF, #E0FFD7)', // Soft Blue-Green
        'linear-gradient(135deg, #FFF9C4, #FFDAE9)', // Soft Yellow-Pink
        'linear-gradient(135deg, #D1C4E9, #A7FFEB)', // Soft Purple-Aqua
        'linear-gradient(135deg, #B2EBF2, #DCEDC8)', // Soft Teal-Lime
        'linear-gradient(135deg, #FFCCBC, #FFE0B2)', // Soft Orange-Peach
    ];
    return gradients[index % gradients.length];
};

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
        } catch (err) {
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
                {/*<header className={styles.header}>*/}
                {/*    <h1>Our Volunteers</h1>*/}
                {/*    <p>A dedicated team ready to make a difference.</p>*/}
                {/*</header>*/}
                <div className={styles.userGrid}>
                    {volunteers.map((user, index) => (
                        <div
                            key={user.id}
                            className={styles.userCard}
                            onClick={() => navigate(`/volunteer/${user.id}`)}
                            style={{ background: generateCardGradient(index) }}
                        >
                            <div className={`${styles.statusIndicator} ${styles[(user.availabilityStatus || 'unavailable').toLowerCase()]}`}>
                                {user.availabilityStatus === 'Available' ? <FaUserCheck /> : <FaUserClock />}
                            </div>
                            <div className={styles.cardContent}>
                                <div className={styles.profilePlaceholder}>
                                    <FaUser />
                                </div>
                                <div className={styles.userInfo}>
                                    <h3>{user.fullName}</h3>
                                    <p className={styles.positionTag}>{(user.position || 'MEMBER').replace(/_/g, ' ')}</p>
                                </div>
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