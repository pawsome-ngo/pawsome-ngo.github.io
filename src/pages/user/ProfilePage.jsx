import React, { useState, useEffect } from 'react';
import styles from './ProfilePage.module.css';
// --- ✨ Import all icons ---
import { FaUser, FaShieldAlt, FaToggleOn, FaToggleOff, FaSpinner, FaCheckCircle, FaExclamationCircle, FaMapMarkerAlt, FaFirstAid, FaBell, FaCar, FaHome } from 'react-icons/fa';
import { subscribeToPushNotifications } from '../../pushSubscription.js'; // Import the push function
// --- End Imports ---
import UpdatePasswordModal from '../../components/common/UpdatePasswordModal.jsx';
import Lightbox from '../../components/common/Lightbox.jsx';
import Avatar from '../../components/common/Avatar.jsx';
// --- ✨ Import Link and useOutletContext ---
import { Link, useOutletContext } from 'react-router-dom';
// --- End Import ---
import CustomSelect from '../../components/common/CustomSelect.jsx'; // Import CustomSelect

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

    // --- ✨ State for new/complex fields ---
    const [isSubscribing, setIsSubscribing] = useState(false);
    const [vehicleType, setVehicleType] = useState('Bike'); // State for vehicle type dropdown
    // --- End State ---

    // --- ✨ 2. Get the setFullUserProfile function from context ---
    const { setFullUserProfile } = useOutletContext();
    // --- End ---

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (!response.ok) throw new Error('Failed to fetch profile.');
                const data = await response.json();
                setProfile(data);
                // --- ✨ Set vehicleType state from fetched data ---
                setVehicleType(data.vehicleType || 'Bike');
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

    // --- ✨ Generic Toggle Handler ---
    // Handles simple boolean toggles by sending to a specific endpoint
    const handleToggle = async (field, endpoint, newValue) => {
        const oldValue = profile[field]; // Store old value for revert
        // Optimistic UI update
        setProfile(prev => ({ ...prev, [field]: newValue }));

        try {
            await fetch(`${API_BASE_URL}/api/profile/${endpoint}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ [field]: newValue }), // e.g., { "availabilityStatus": "Available" }
            });
            // --- ✨ On success, update the global state ---
            if (setFullUserProfile) { // Check if function exists
                setFullUserProfile(prev => ({ ...prev, [field]: newValue }));
            }

        } catch (err) {
            // Revert local state on error
            setProfile(prev => ({ ...prev, [field]: oldValue }));
            alert(`Failed to update ${field}. Please try again.`);
        }
    };

    // --- ✨ Vehicle Toggle Handler (Slightly complex) ---
    const handleVehicleToggle = async () => {
        const newStatus = !profile.hasVehicle;
        const oldStatus = profile.hasVehicle; // Store old value
        // Optimistic UI update
        setProfile(prev => ({ ...prev, hasVehicle: newStatus }));

        try {
            await fetch(`${API_BASE_URL}/api/profile/vehicle`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ hasVehicle: newStatus, vehicleType: newStatus ? vehicleType : null }),
            });
            // --- ✨ On success, update the global state ---
            if (setFullUserProfile) { // Check if function exists
                setFullUserProfile(prev => ({ ...prev, hasVehicle: newStatus, vehicleType: newStatus ? vehicleType : null }));
            }
        } catch (err) {
            setProfile(prev => ({ ...prev, hasVehicle: oldStatus }));
            alert('Failed to update vehicle status. Please try again.');
        }
    };

    // --- ✨ Vehicle Type Change Handler (Calls same endpoint) ---
    const handleVehicleTypeChange = async (e) => {
        const newType = e.target.value;
        const oldType = profile.vehicleType; // Store old value
        setVehicleType(newType); // Update local dropdown state
        setProfile(prev => ({ ...prev, vehicleType: newType })); // Optimistic local

        try {
            await fetch(`${API_BASE_URL}/api/profile/vehicle`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ hasVehicle: profile.hasVehicle, vehicleType: newType }),
            });
            // --- ✨ On success, update the global state ---
            if (setFullUserProfile) { // Check if function exists
                setFullUserProfile(prev => ({ ...prev, vehicleType: newType }));
            }
        } catch (err) {
            alert('Failed to update vehicle type. Please try again.');
            // Revert local state
            setVehicleType(oldType || 'Bike');
            setProfile(prev => ({ ...prev, vehicleType: oldType }));
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

    if (loading) return <div className={styles.centered}><FaSpinner className={styles.spinner} /></div>;
    if (error) return <div className={styles.centered}><p className={styles.error}>{error}</p></div>;
    if (!profile) return null;

    const vehicleTypeOptions = [
        { value: 'Bike', label: 'Bike' },
        { value: 'Scooty', label: 'Scooty' },
        { value: 'Car', label: 'Car' },
        { value: 'Other', label: 'Other' },
    ];

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

                {/* --- ✨ Redesigned Settings Section --- */}

                <div className={styles.card}>
                    <h2>My Settings</h2>
                    {/* Availability */}
                    <div className={styles.settingSection}>
                        <h2>Availability</h2>
                        <button
                            onClick={() => handleToggle('availabilityStatus', 'availability', profile.availabilityStatus === 'Available' ? 'Unavailable' : 'Available')}
                            className={styles.toggleSwitch}
                        >
                            {profile.availabilityStatus === 'Available' ? <FaToggleOn className={styles.toggleOn} /> : <FaToggleOff className={styles.toggleOff} />}
                        </button>
                    </div>

                    {/* First-Aid Kit */}
                    <div className={styles.settingSection}>
                        <h2><FaFirstAid /> I have a First-Aid Kit</h2>
                        <button
                            onClick={() => handleToggle('hasMedicineBox', 'medicine-box', !profile.hasMedicineBox)}
                            className={styles.toggleSwitch}
                        >
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

                    {/* Vehicle */}
                    <div className={styles.settingSection}>
                        <h2><FaCar /> I have a vehicle</h2>
                        <button
                            onClick={handleVehicleToggle}
                            className={styles.toggleSwitch}
                        >
                            {profile.hasVehicle ? <FaToggleOn className={styles.toggleOn} /> : <FaToggleOff className={styles.toggleOff} />}
                        </button>
                    </div>
                    {profile.hasVehicle && (
                        <div className={styles.vehicleTypeSelector}>
                            <label>Vehicle Type</label>
                            <CustomSelect
                                name="vehicleType"
                                options={vehicleTypeOptions}
                                value={vehicleType}
                                onChange={handleVehicleTypeChange}
                            />
                        </div>
                    )}

                    {/* Shelter */}
                    <div className={styles.settingSection}>
                        <h2><FaHome /> I can provide shelter</h2>
                        <button
                            onClick={() => handleToggle('canProvideShelter', 'shelter', !profile.canProvideShelter)}
                            className={styles.toggleSwitch}
                        >
                            {profile.canProvideShelter ? <FaToggleOn className={styles.toggleOn} /> : <FaToggleOff className={styles.toggleOff} />}
                        </button>
                    </div>
                </div>

                <div className={styles.card}>
                    <h2>Actions</h2>
                    {/* Location */}
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

                    {/* Notifications */}
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

                    {/* Security */}
                    <div className={styles.settingSection}>
                        <h2><FaShieldAlt /> Account Security</h2>
                        <button onClick={() => setIsPasswordModalOpen(true)} className={styles.actionButton}>
                            Change Password
                        </button>
                    </div>
                </div>

                {/* --- End Redesigned Section --- */}
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