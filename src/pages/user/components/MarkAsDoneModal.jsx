import React, { useState, useEffect } from 'react';
import styles from './MarkAsDoneModal.module.css';
import { FaMapMarkerAlt, FaSpinner, FaExclamationTriangle, FaClipboard } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// A helper function for robust copying to clipboard
const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        return new Promise((res, rej) => {
            document.execCommand('copy') ? res() : rej();
            document.body.removeChild(textArea);
        });
    }
};

const MarkAsDoneModal = ({ incident, token, onClose, onCaseCompleted }) => {
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [finalLocation, setFinalLocation] = useState(null);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [teamDetails, setTeamDetails] = useState(null);

    const isLocationMissing = incident.latitude === null;

    useEffect(() => {
        const fetchTeamDetails = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/incidents/${incident.id}/assignment/team`, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (response.ok) {
                    const data = await response.json();
                    setTeamDetails(data);
                }
            } catch (err) {
                console.error("Could not fetch team details for modal.", err);
            }
        };

        if (incident) {
            fetchTeamDetails();
        }
    }, [incident, token]);


    const handleCopyDetails = () => {
        if (!resolutionNotes.trim()) {
            setFeedback('Please write the resolution notes before copying.');
            return;
        }

        const teamMembers = teamDetails?.teamMembers
            ?.map(member => `- @${member.fullName}`)
            .join('\n') || 'N/A';

        const formattedDetails = `
       ✅ CASE COMPLETED ✅

🔹 Incident ID: ${incident.id}
🐾 Animal: ${incident.animalType}
📍 Location: ${incident.location}

👥 Team: ${teamDetails?.teamName || 'N/A'}
Members:
${teamMembers}

📝 Resolution Notes:
${resolutionNotes}

Team has successfully attended the issue. The case is now closed. 🙏
        `.trim();

        copyToClipboard(formattedDetails).then(() => {
            setIsCopied(true);
            setFeedback('Report copied to clipboard!');
            setTimeout(() => setIsCopied(false), 2000);
        }).catch(err => {
            console.error('Failed to copy details: ', err);
            setFeedback('Failed to copy details.');
        });
    };

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
                        <label>Final Location</label>
                        {isLocationMissing && (
                            <div className={styles.locationWarning}>
                                <FaExclamationTriangle />
                                <span>The incident location isn't set. Please update it now if you are at the scene.</span>
                            </div>
                        )}
                        <button
                            type="button"
                            onClick={handleGetLocation}
                            className={`${styles.locationButton} ${isLocationMissing ? styles.highlightButton : ''}`}
                        >
                            <FaMapMarkerAlt /> Update to Current Location
                        </button>
                    </div>

                    <div className={styles.formGroup}>
                        <label htmlFor="mediaFiles">Add Final Photos/Videos (Optional)</label>
                        <input type="file" id="mediaFiles" multiple onChange={handleFileChange} />
                    </div>

                    <div className={styles.feedbackArea}>
                        {feedback && <p>{feedback}</p>}
                    </div>

                    <div className={styles.actions}>
                        <button type="button" onClick={onClose} className={styles.cancelButton} disabled={isSubmitting}>Cancel</button>
                        <button type="button" onClick={handleCopyDetails} className={styles.copyButton} disabled={!resolutionNotes.trim() || !teamDetails}>
                            <FaClipboard /> {isCopied ? 'Copied!' : 'Copy for Report'}
                        </button>
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

