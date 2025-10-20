// File: pawsome-ngo/full/full-d91a39b5e3886f03789eb932561a5689b5f95888/pawsome-frontend-code-react/src/pages/user/ProfilePage.jsx

import React, { useState, useEffect } from 'react';
import styles from './ProfilePage.module.css';
// --- ✨ Import FaBell and the new subscription function ---
import { FaUser, FaShieldAlt, FaToggleOn, FaToggleOff, FaSpinner, FaCheckCircle, FaExclamationCircle, FaMapMarkerAlt, FaFirstAid, FaBell } from 'react-icons/fa';
import { subscribeToPushNotifications } from '../../pushSubscription.js'; // Import the function
// --- End Imports ---
import UpdatePasswordModal from '../../components/common/UpdatePasswordModal.jsx';
import Lightbox from '../../components/common/Lightbox.jsx';
import Avatar from '../../components/common/Avatar.jsx';
import { Link } from 'react-router-dom';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const avatarModules = import.meta.glob('/src/assets/avatars/*');

const getAvatarSrc = async (userId) => {
    for (const path in avatarModules) {
        if (path.includes(`/avatars/${userId}.`)) {
            const mod = await avatarModules[path]();
            return mod.default;
        }
    }
    return null;
};

const ProfilePage = ({ token }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lightboxSrc, setLightboxSrc] = useState(null);

    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isUpdatingLocation, setIsUpdatingLocation] = useState(false);
    const [locationMessage, setLocationMessage] = useState({ type: '', text: '' });
    // --- ✨ Add state for notification button ---
    const [isSubscribing, setIsSubscribing] = useState(false);
    // --- End State ---

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

    const handleAvatarClick = async () => {
        if (profile) {
            const src = await getAvatarSrc(profile.id);
            if (src) {
                setLightboxSrc(src);
            }
        }
    };

    const handleAvailabilityToggle = async () => {
        const newStatus = profile.availabilityStatus === 'Available' ? 'Unavailable' : 'Available';
        try {
            setProfile({ ...profile, availabilityStatus: newStatus });
            await fetch(`${API_BASE_URL}/api/profile/availability`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ availabilityStatus: newStatus }),
            });
        } catch (err) {
            setProfile({ ...profile, availabilityStatus: profile.availabilityStatus });
            alert('Failed to update availability. Please try again.');
        }
    };

    const handleMedicineBoxToggle = async () => {
        const newStatus = !profile.hasMedicineBox;
        try {
            setProfile({ ...profile, hasMedicineBox: newStatus });
            await fetch(`${API_BASE_URL}/api/profile/medicine-box`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ hasMedicineBox: newStatus }),
            });
        } catch (err) {
            setProfile({ ...profile, hasMedicineBox: profile.hasMedicineBox });
            alert('Failed to update first-aid kit status. Please try again.');
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
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
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

    // --- ✨ Add handler for the notification button ---
    const handleSubscribeClick = async () => {
        setIsSubscribing(true);
        setLocationMessage({ type: '', text: '' }); // Clear other messages

        const success = await subscribeToPushNotifications(token);

        if (success) {
            setLocationMessage({ type: 'success', text: 'Notifications enabled!' });
        } else {
            // alert() is already handled in the function, just clear loading
        }

        setIsSubscribing(false);
        setTimeout(() => setLocationMessage({ type: '', text: '' }), 3000); // Clear message after 3s
    };
    // --- End Handler ---

    if (loading) return <div className={styles.centered}><FaSpinner className={styles.spinner} /></div>;
    if (error) return <div className={styles.centered}><p className={styles.error}>{error}</p></div>;
    if (!profile) return null;

    return (
        <>
            <div className={styles.container}>
                <div className={styles.topHeaderBackground}>
                    <div className={styles.avatarContainer} onClick={handleAvatarClick}>
                        <Avatar
                            userId={profile.id}
                            name={profile.firstName}
                            className={styles.avatar}
                        />
                    </div>
                </div>

                <div className={styles.profileInfo}>
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
                        <h2><FaFirstAid /> I have a First-Aid Kit</h2>
                        <button onClick={handleMedicineBoxToggle} className={styles.toggleButton}>
                            {profile.hasMedicineBox ? <FaToggleOn className={styles.toggleOn} /> : <FaToggleOff className={styles.toggleOff} />}
                        </button>
                    </div>
                    {profile.hasMedicineBox && (
                        <div className={styles.manageKitContainer}>
                            <Link to={`/profile/first-aid-kit/${profile.id}`} className={styles.actionButton}>
                                Manage Kit
                            </Link>
                        </div>
                    )}
                </div>

                {/* --- ✨ Add Notification Subscription Card --- */}
                <div className={styles.card}>
                    <div className={styles.settingSection}>
                        <h2><FaBell /> Notifications</h2>
                        <button
                            onClick={handleSubscribeClick}
                            className={styles.actionButton}
                            disabled={isSubscribing}
                        >
                            {isSubscribing ? <FaSpinner className={styles.spinnerIcon} /> : 'Enable Notifications'}
                        </button>
                    </div>
                </div>
                {/* --- End Card --- */}

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
            <Lightbox src={lightboxSrc} alt="Profile Picture" onClose={() => setLightboxSrc(null)} />
        </>
    );
};

export default ProfilePage;