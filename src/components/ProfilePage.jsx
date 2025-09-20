import React, { useState, useEffect } from 'react';
import styles from './ProfilePage.module.css';
import { FaUser, FaShieldAlt, FaToggleOn, FaToggleOff, FaSpinner, FaCheckCircle, FaExclamationCircle, FaMapMarkerAlt } from 'react-icons/fa';
import UpdatePasswordModal from './UpdatePasswordModal';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const ProfilePage = ({ token }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
    const [locationMessage, setLocationMessage] = useState({ type: '', text: '' });

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!response.ok) throw new Error('Failed to fetch profile.');
                const data = await response.json();
                setProfile(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchProfile();
        }
    }, [token]);

    const handleAvailabilityToggle = async () => {
        const newStatus = profile.availabilityStatus === 'Available' ? 'Unavailable' : 'Available';
        try {
            setProfile({ ...profile, availabilityStatus: newStatus }); // Optimistic UI update
            await fetch(`${API_BASE_URL}/api/profile/availability`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ availabilityStatus: newStatus }),
            });
        } catch (err) {
            // Revert on error
            setProfile({ ...profile, availabilityStatus: profile.availabilityStatus });
            alert('Failed to update availability. Please try again.');
        }
    };

    const handleUpdateLocation = () => {
        if (!navigator.geolocation) {
            setLocationMessage({ type: 'error', text: 'Geolocation is not supported by your browser.' });
            return;
        }

        setIsUpdatingLocation(true);
        setLocationMessage({ type: 'info', text: 'Getting your location...' });

        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            setLocationMessage({ type: 'info', text: 'Location found. Updating...' });

            try {
                const response = await fetch(`${API_BASE_URL}/api/profile/location`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ latitude, longitude }),
                });

                if (!response.ok) throw new Error('Failed to update location on the server.');

                setLocationMessage({ type: 'success', text: 'Location updated successfully!' });
            } catch (err) {
                setLocationMessage({ type: 'error', text: err.message });
            } finally {
                setIsUpdatingLocation(false);
            }
        }, (error) => {
            setLocationMessage({ type: 'error', text: 'Unable to retrieve location. Please check permissions.' });
            setIsUpdatingLocation(false);
        });
    };

    if (loading) return <div className={styles.container}><div className={styles.centered}><FaSpinner className={styles.spinner} /></div></div>;
    if (error) return <div className={styles.container}><p className={styles.error}>{error}</p></div>;

    return (
        <>
            <div className={styles.container}>
                <div className={styles.profileHeader}>
                    <div className={styles.avatar}>
                        {profile.firstName.charAt(0)}
                    </div>
                    <h1>{profile.firstName} {profile.lastName}</h1>
                    <p>@{profile.username}</p>
                </div>

                <div className={styles.card}>
                    <h2>My Stats</h2>
                    <div className={styles.statsGrid}>
                        <div className={styles.statItem}>
                            <span className={styles.gradientText}>{profile.casesCompleted}</span>
                            <p>Cases Completed</p>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.gradientText}>{profile.hearts}</span>
                            <p>Hearts Earned</p>
                        </div>
                        <div className={styles.statItem}>
                            <span className={styles.gradientText}>{profile.distanceTraveled} km</span>
                            <p>Distance Traveled</p>
                        </div>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.settingSection}>
                        <h2>Availability</h2>
                        <button onClick={handleAvailabilityToggle} className={styles.toggleButton}>
                            {profile.availabilityStatus === 'Available' ? <FaToggleOn className={styles.toggleOn} /> : <FaToggleOff className={styles.toggleOff} />}
                            <span className={profile.availabilityStatus === 'Available' ? styles.statusOn : styles.statusOff}>
                                {profile.availabilityStatus}
                            </span>
                        </button>
                    </div>
                </div>

                <div className={styles.card}>
                    <div className={styles.settingSection}>
                        <h2><FaMapMarkerAlt /> My Location</h2>
                        <button onClick={handleUpdateLocation} className={styles.actionButton} disabled={isUpdatingLocation}>
                            {isUpdatingLocation ? <FaSpinner className={styles.spinnerIcon} /> : 'Update My Location'}
                        </button>
                    </div>
                    {locationMessage.text && (
                        <div className={`${styles.message} ${styles[locationMessage.type]}`}>
                            {locationMessage.type === 'success' ? <FaCheckCircle /> : locationMessage.type === 'error' ? <FaExclamationCircle /> : <FaSpinner className={styles.spinnerIcon} />}
                            {locationMessage.text}
                        </div>
                    )}
                </div>

                <div className={styles.card}>
                    <div className={styles.settingSection}>
                        <h2><FaShieldAlt /> Account Security</h2>
                        <button onClick={() => setIsPasswordModalOpen(true)} className={styles.actionButton}>
                            Change Password
                        </button>
                    </div>
                </div>
            </div>

            {isPasswordModalOpen && (
                <UpdatePasswordModal
                    token={token}
                    onClose={() => setIsPasswordModalOpen(false)}
                />
            )}
        </>
    );
};

export default ProfilePage;