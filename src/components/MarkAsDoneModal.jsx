import React, { useState } from 'react';
import styles from './MarkAsDoneModal.module.css';
import { FaMapMarkerAlt, FaSpinner } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const MarkAsDoneModal = ({ incident, token, onClose, onCaseCompleted }) => {
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [finalLocation, setFinalLocation] = useState(null);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState('');

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setFeedback('Geolocation is not supported by your browser.');
            return;
        }
        setFeedback('Getting current location...');
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setFinalLocation({ latitude, longitude });
                setFeedback(`Location captured: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
            },
            () => {
                setFeedback('Unable to retrieve location. Please check permissions.');
            }
        );
    };

    const handleFileChange = (e) => {
        setMediaFiles([...e.target.files]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setFeedback('Submitting...');

        const formData = new FormData();
        const details = {
            resolutionNotes,
            finalLatitude: finalLocation?.latitude,
            finalLongitude: finalLocation?.longitude,
        };
        formData.append('details', new Blob([JSON.stringify(details)], { type: 'application/json' }));

        mediaFiles.forEach(file => {
            formData.append('mediaFiles', file);
        });

        try {
            const response = await fetch(`${API_BASE_URL}/api/cases/${incident.id}/close`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (response.ok) {
                setFeedback('Case completed successfully!');
                setTimeout(() => {
                    onCaseCompleted(incident.id);
                    onClose();
                }, 1500);
            } else {
                throw new Error('Failed to complete the case.');
            }
        } catch (err) {
            console.error(err);
            setFeedback('An error occurred. Please try again.');
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <h2>Complete Case #{incident.id}</h2>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="resolutionNotes">Resolution Notes</label>
                        <textarea
                            id="resolutionNotes"
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            placeholder="e.g., Animal was given first aid and taken to the shelter."
                            rows="4"
                            required
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Final Location (Optional)</label>
                        <button type="button" onClick={handleGetLocation} className={styles.locationButton}>
                            <FaMapMarkerAlt /> Update to Current Location
                        </button>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="mediaFiles">Add Final Media (Optional)</label>
                        <input type="file" id="mediaFiles" multiple onChange={handleFileChange} />
                    </div>

                    <div className={styles.feedbackArea}>
                        {feedback && <p>{feedback}</p>}
                    </div>

                    <div className={styles.actions}>
                        <button type="button" onClick={onClose} className={styles.cancelButton} disabled={isSubmitting}>Cancel</button>
                        <button type="submit" disabled={isSubmitting} className={styles.submitButton}>
                            {isSubmitting ? <FaSpinner className={styles.spinner} /> : 'Mark as Done'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default MarkAsDoneModal;