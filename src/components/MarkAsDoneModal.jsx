import React, { useState, useRef } from 'react';
import styles from './MarkAsDoneModal.module.css';
import { FaMapMarkerAlt, FaSpinner, FaExclamationTriangle, FaMicrophone, FaStop, FaTrash } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const MarkAsDoneModal = ({ incident, token, onClose, onCaseCompleted }) => {
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [finalLocation, setFinalLocation] = useState(null);
    const [mediaFiles, setMediaFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState('');

    // --- NEW: State for audio recording ---
    const [isRecording, setIsRecording] = useState(false);
    const [audioURL, setAudioURL] = useState('');
    const [audioFile, setAudioFile] = useState(null);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);

    const isLocationMissing = incident.latitude === null;

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

    // --- NEW: Audio Recording Functions ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            mediaRecorder.current.ondataavailable = event => {
                audioChunks.current.push(event.data);
            };
            mediaRecorder.current.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
                const url = URL.createObjectURL(audioBlob);
                setAudioURL(url);
                setAudioFile(new File([audioBlob], `voice-note-${Date.now()}.wav`, { type: 'audio/wav' }));
                audioChunks.current = [];
            };
            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (err) {
            alert("Could not access microphone. Please check your browser permissions.");
        }
    };

    const stopRecording = () => {
        mediaRecorder.current.stop();
        setIsRecording(false);
    };

    const deleteAudio = () => {
        setAudioURL('');
        setAudioFile(null);
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

        // --- NEW: Append voice note if it exists ---
        if (audioFile) {
            formData.append('voiceNote', audioFile);
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/cases/${incident.id}/close`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData,
            });

            if (!response.ok) throw new Error('Failed to complete the case.');

            setFeedback('Case completed successfully!');
            setTimeout(() => {
                onCaseCompleted(incident.id);
                onClose();
            }, 1500);

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
                        <label htmlFor="resolutionNotes">Resolution Notes (Optional)</label>
                        <textarea
                            id="resolutionNotes"
                            value={resolutionNotes}
                            onChange={(e) => setResolutionNotes(e.target.value)}
                            placeholder="e.g., Animal was given first aid and taken to the shelter."
                            rows="4"
                        />
                    </div>

                    <div className={styles.formGroup}>
                        <label>Record a Voice Note (Optional)</label>
                        <div className={styles.recorderContainer}>
                            {!isRecording && !audioURL && (
                                <button type="button" onClick={startRecording} className={styles.recordButton}>
                                    <FaMicrophone /> Start Recording
                                </button>
                            )}
                            {isRecording && (
                                <button type="button" onClick={stopRecording} className={`${styles.recordButton} ${styles.stopButton}`}>
                                    <FaStop /> Stop Recording
                                </button>
                            )}
                            {audioURL && (
                                <div className={styles.audioPlayerContainer}>
                                    <audio src={audioURL} controls />
                                    <button type="button" onClick={deleteAudio} className={styles.deleteButton}><FaTrash /></button>
                                </div>
                            )}
                        </div>
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

                    <div className={styles.feedbackArea}>{feedback && <p>{feedback}</p>}</div>

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