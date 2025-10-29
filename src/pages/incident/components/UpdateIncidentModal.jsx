// File: src/pages/incident/components/UpdateIncidentModal.jsx
import React, { useState, useEffect, useMemo } from 'react'; // --- ✨ NEW: Import useMemo ---
import styles from './UpdateIncidentModal.module.css';
import CustomSelect from '../../../components/common/CustomSelect.jsx';
import { FaTimes, FaSpinner, FaSave, FaMapMarkerAlt } from 'react-icons/fa';
import UnauthorizedModal from '../../../components/common/UnauthorizedModal.jsx'; // --- ✨ NEW: Import UnauthorizedModal ---

// Ensure VITE_API_BASE_URL is defined in your .env file
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// --- ✨ NEW: Add currentUser to props ---
const UpdateIncidentModal = ({ isOpen, onClose, incidentData, token, onSaveSuccess, currentUser }) => {
    // State for form data
    const [formData, setFormData] = useState({
        informerName: '',
        contactNumber: '',
        animalType: 'DOG',
        description: '',
        location: '',
        latitude: null,
        longitude: null,
    });
    // State for loading/error during save
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    // State for location fetching
    const [isFetchingLocation, setIsFetchingLocation] = useState(false);
    const [locationStatus, setLocationStatus] = useState('');

    // --- ✨ NEW: State for unauthorized modal ---
    const [isUnauthorizedModalOpen, setIsUnauthorizedModalOpen] = useState(false);

    // --- ✨ NEW: Check permissions with useMemo ---
    const canUpdateIncident = useMemo(() =>
            currentUser?.roles.includes('ROLE_RESCUE_CAPTAIN') ||
            currentUser?.roles.includes('ROLE_ADMIN') ||
            currentUser?.roles.includes('ROLE_SUPER_ADMIN'),
        [currentUser]
    );

    // Pre-fill form when modal opens or incidentData changes
    useEffect(() => {
        if (isOpen && incidentData) {
            setFormData({
                informerName: incidentData.informerName || '',
                contactNumber: incidentData.contactNumber || '',
                animalType: incidentData.animalType || 'DOG',
                description: incidentData.description || '',
                location: incidentData.location || '',
                latitude: incidentData.latitude || null,
                longitude: incidentData.longitude || null,
            });
            setError(''); // Clear previous errors
            setLocationStatus(''); // Clear location status
            setIsUnauthorizedModalOpen(false); // --- ✨ NEW: Reset auth modal ---
        }
    }, [isOpen, incidentData]);

    // Close modal if isOpen becomes false
    useEffect(() => {
        if (!isOpen) {
            // Optional: Reset state if needed when closing externally
            setIsSaving(false);
            setError('');
            setIsFetchingLocation(false);
            setLocationStatus('');
        }
    }, [isOpen]);


    // Return null if modal is not open
    if (!isOpen) return null;

    // Handle standard form input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };

    // Handle fetching geolocation
    const handleGetLocation = () => {
        // ... (this function remains unchanged)
        if (!navigator.geolocation) {
            setLocationStatus('Geolocation is not supported by your browser.');
            return;
        }
        setIsFetchingLocation(true);
        setLocationStatus('Fetching location...');
        setError('');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setFormData(prevState => ({
                    ...prevState,
                    latitude: latitude,
                    longitude: longitude,
                }));
                setLocationStatus(`Location captured: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
                setIsFetchingLocation(false);
            },
            (geoError) => {
                console.error("Geolocation error:", geoError);
                setLocationStatus(`Unable to retrieve location: ${geoError.message}. Check permissions.`);
                setIsFetchingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // Handle form submission to save changes
    const handleSave = async (e) => {
        e.preventDefault(); // Prevent default form submission

        // --- ✨ NEW: Permission Check ---
        if (!canUpdateIncident) {
            setIsUnauthorizedModalOpen(true);
            return; // Stop the save
        }
        // --- End New Check ---

        setIsSaving(true);
        setError('');
        setLocationStatus(''); // Clear location status on save attempt

        // ... (rest of the save logic is unchanged)
        const dataToSave = {
            informerName: formData.informerName,
            contactNumber: formData.contactNumber,
            animalType: formData.animalType,
            description: formData.description,
            location: formData.location,
            latitude: formData.latitude,
            longitude: formData.longitude,
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentData.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSave),
            });
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({ message: `HTTP error! Status: ${response.status}` }));
                throw new Error(errorBody.message || 'Failed to update incident. Please check details and try again.');
            }
            const updatedIncident = await response.json();
            onSaveSuccess(updatedIncident);
            onClose();
        } catch (err) {
            console.error("Error saving incident:", err);
            setError(err.message || 'Failed to save changes. Check connection or input.');
        } finally {
            setIsSaving(false);
        }
    };

    // Options for the animal type dropdown
    const animalOptions = [
        // ... (options unchanged)
        { value: 'DOG', label: 'Dog' },
        { value: 'CAT', label: 'Cat' },
        { value: 'CATTLE', label: 'Cattle' },
        { value: 'BIRD', label: 'Bird' },
        { value: 'OTHER', label: 'Other' },
    ];

    // --- ✨ NEW: Wrap return in React.Fragment ---
    return (
        <>
            {/* Modal overlay closes modal on click outside content */}
            <div className={styles.modalOverlay} onClick={onClose}>
                {/* Modal content prevents click propagation */}
                <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                    <div className={styles.modalHeader}>
                        <h2>Edit Incident #{incidentData?.id}</h2>
                        {/* Close button */}
                        <button onClick={onClose} className={styles.closeButton} disabled={isSaving || isFetchingLocation}><FaTimes /></button>
                    </div>

                    {/* Form for editing */}
                    <form onSubmit={handleSave}>
                        <div className={styles.formGrid}>
                            {/* ... (all form fields are unchanged) ... */}
                            {/* Informer Name */}
                            <div className={styles.formGroup}>
                                <label htmlFor="informerName">Informer Name</label>
                                <input type="text" id="informerName" name="informerName" value={formData.informerName} onChange={handleChange} required disabled={isSaving || isFetchingLocation}/>
                            </div>
                            {/* Contact Number */}
                            <div className={styles.formGroup}>
                                <label htmlFor="contactNumber">Contact Number</label>
                                <input type="tel" id="contactNumber" name="contactNumber" value={formData.contactNumber} onChange={handleChange} required disabled={isSaving || isFetchingLocation}/>
                            </div>
                            {/* Location Description */}
                            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                <label htmlFor="location">Location Description</label>
                                <input type="text" id="location" name="location" value={formData.location} onChange={handleChange} required disabled={isSaving || isFetchingLocation}/>
                            </div>

                            {/* Location Fetching Section */}
                            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                <label>Pinpoint Location (Optional)</label>
                                <button
                                    type="button"
                                    onClick={handleGetLocation}
                                    className={styles.locationButton}
                                    disabled={isFetchingLocation || isSaving}
                                >
                                    {isFetchingLocation ? <FaSpinner className={styles.spinner} /> : <FaMapMarkerAlt />}
                                    {isFetchingLocation ? 'Fetching...' : 'Use Current Location'}
                                </button>
                                {/* Display status or fetched coordinates */}
                                {locationStatus && <p className={styles.locationStatus}>{locationStatus}</p>}
                                {formData.latitude && formData.longitude && !isFetchingLocation && !locationStatus.startsWith('Unable') && (
                                    <p className={styles.coordinatesDisplay}>
                                        Current Coordinates: {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
                                    </p>
                                )}
                            </div>

                            {/* Animal Type Dropdown */}
                            <div className={styles.formGroup}>
                                <label htmlFor="animalType">Animal Type</label>
                                <CustomSelect name="animalType" options={animalOptions} value={formData.animalType} onChange={handleChange} disabled={isSaving || isFetchingLocation}/>
                            </div>

                            {/* Description Textarea */}
                            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                <label htmlFor="description">Description</label>
                                <textarea id="description" name="description" rows="4" value={formData.description} onChange={handleChange} required disabled={isSaving || isFetchingLocation}></textarea>
                            </div>

                            {/* Display API errors here */}
                            {error && <p className={styles.errorMessage}>{error}</p>}
                        </div>

                        {/* Modal Action Buttons */}
                        <div className={styles.modalActions}>
                            <button type="button" onClick={onClose} className={styles.cancelButton} disabled={isSaving || isFetchingLocation}>Cancel</button>
                            <button type="submit" className={styles.saveButton} disabled={isSaving || isFetchingLocation}>
                                {isSaving ? <FaSpinner className={styles.spinner} /> : <FaSave />}
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* --- ✨ NEW: Render the UnauthorizedModal --- */}
            {isUnauthorizedModalOpen && (
                <UnauthorizedModal
                    isOpen={isUnauthorizedModalOpen}
                    onClose={() => setIsUnauthorizedModalOpen(false)}
                    message="You need 'Rescue Captain' or a higher role to update incident details."
                />
            )}
        </>
    );
};

export default UpdateIncidentModal;