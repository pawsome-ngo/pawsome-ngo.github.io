import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaMicrophone, FaStop, FaTrash, FaFileAlt, FaMapMarkerAlt, FaSpinner } from 'react-icons/fa';
import CustomSelect from './CustomSelect';
import SignUpModal from './SignUpModal';
import styles from './ReportIncidentPage.module.css';
import appStyles from '../App.module.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const ReportIncidentPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        informerName: '',
        contactNumber: '',
        animalType: 'DOG',
        description: '',
        latitude: null,
        longitude: null,
        location: '',
    });
    const [mediaFiles, setMediaFiles] = useState([]);
    const [locationStatus, setLocationStatus] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMessage, setModalMessage] = useState('');

    // State for audio recording
    const [isRecording, setIsRecording] = useState(false);
    const [audioURL, setAudioURL] = useState('');
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };

    const handleFileChange = (e) => {
        setMediaFiles(prevFiles => [...prevFiles, ...Array.from(e.target.files)]);
    };

    const handleGetLocation = () => {
        setLocationStatus('Fetching location...');
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData(prevState => ({
                        ...prevState,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    }));
                    setLocationStatus(`Location captured successfully!`);
                },
                () => {
                    setLocationStatus('Unable to retrieve your location.');
                }
            );
        } else {
            setLocationStatus('Geolocation is not supported by your browser.');
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder.current = new MediaRecorder(stream);
            mediaRecorder.current.ondataavailable = event => {
                audioChunks.current.push(event.data);
            };
            mediaRecorder.current.onstop = () => {
                const audioBlob = new Blob(audioChunks.current, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setAudioURL(audioUrl);
                const audioFile = new File([audioBlob], `voice-report-${Date.now()}.wav`, { type: 'audio/wav' });
                setMediaFiles(prevFiles => [...prevFiles, audioFile]);
                audioChunks.current = [];
            };
            mediaRecorder.current.start();
            setIsRecording(true);
        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please check your browser permissions.");
        }
    };

    const stopRecording = () => {
        mediaRecorder.current.stop();
        setIsRecording(false);
    };

    const removeFile = (fileName) => {
        setMediaFiles(prevFiles => prevFiles.filter(file => file.name !== fileName));
        if (fileName.startsWith('voice-report-')) {
            setAudioURL('');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const data = new FormData();
        const incidentDetails = {
            ...formData,
            latitude: formData.latitude || undefined,
            longitude: formData.longitude || undefined,
        };
        data.append('incident', new Blob([JSON.stringify(incidentDetails)], { type: 'application/json' }));

        mediaFiles.forEach(file => {
            data.append('media', file);
        });

        try {
            const response = await fetch(`${API_BASE_URL}/api/incidents/report`, {
                method: 'POST',
                body: data,
            });

            const result = await response.json();

            if (response.ok) {
                setModalMessage(result.message || 'Incident reported successfully!');
                setIsModalOpen(true);
            } else {
                setModalMessage(result.message || 'Failed to report incident.');
                setIsModalOpen(true);
            }
        } catch (error) {
            setModalMessage('An error occurred. Please try again.');
            setIsModalOpen(true);
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        navigate('/');
    };

    const animalOptions = [
        { value: 'DOG', label: 'Dog' },
        { value: 'CAT', label: 'Cat' },
        { value: 'CATTLE', label: 'Cattle' },
        { value: 'BIRD', label: 'Bird' },
        { value: 'OTHER', label: 'Other' },
    ];

    return (
        <>
            <div className={styles.formContainer}>
                <div className={styles.formHeader}>
                    <h1>Report an Incident</h1>
                    <p>Your report can save a life. Please provide as much detail as possible.</p>
                </div>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label htmlFor="informerName" className={styles.formLabel}>Your Name</label>
                            <input type="text" id="informerName" name="informerName" className={styles.formInput} value={formData.informerName} onChange={handleChange} required />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="contactNumber" className={styles.formLabel}>Contact Number</label>
                            <input type="tel" id="contactNumber" name="contactNumber" className={styles.formInput} value={formData.contactNumber} onChange={handleChange} required />
                        </div>
                        <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
                            <label htmlFor="location" className={styles.formLabel}>
                                Location Description (e.g., street, landmark)
                            </label>
                            <input
                                type="text"
                                id="location"
                                name="location"
                                className={styles.formInput}
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="e.g., Near City Park, opposite the bakery"
                                required
                            />
                        </div>
                        <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
                            <label htmlFor="description" className={styles.formLabel}>Description of Incident</label>
                            <textarea id="description" name="description" rows="4" className={styles.formTextarea} value={formData.description} onChange={handleChange} required placeholder="Describe the animal's condition, injuries, and behavior."></textarea>
                        </div>

                        <div className={styles.formGroup}>
                            <label htmlFor="animalType" className={styles.formLabel}>Type of Animal</label>
                            <CustomSelect name="animalType" options={animalOptions} value={formData.animalType} onChange={handleChange} />
                        </div>

                        <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
                            <label className={styles.formLabel}>Upload Media (Optional)</label>
                            <input
                                type="file"
                                multiple
                                onChange={handleFileChange}
                                className={styles.fileInput}
                                accept="image/*,video/*,audio/*"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className={styles.fileInputLabel}>
                                <FaFileAlt /> Choose Photos or Videos
                            </label>
                        </div>

                        {/*<div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>*/}
                        {/*    <label className={styles.formLabel}>Record a Voice Note (Optional)</label>*/}
                        {/*    <div className={styles.recorderContainer}>*/}
                        {/*        {!isRecording && !audioURL && (*/}
                        {/*            <button type="button" onClick={startRecording} className={styles.recordButton}>*/}
                        {/*                <FaMicrophone /> Start Recording*/}
                        {/*            </button>*/}
                        {/*        )}*/}
                        {/*        {isRecording && (*/}
                        {/*            <button type="button" onClick={stopRecording} className={`${styles.recordButton} ${styles.stopButton}`}>*/}
                        {/*                <FaStop /> Stop Recording*/}
                        {/*            </button>*/}
                        {/*        )}*/}
                        {/*    </div>*/}
                        {/*</div>*/}


                        {mediaFiles.length > 0 && (
                            <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
                                <label className={styles.formLabel}>Files to Upload</label>
                                <ul className={styles.fileList}>
                                    {mediaFiles.map((file, index) => (
                                        <li key={index}>
                                            <FaFileAlt /> <span>{file.name}</span>
                                            <button type="button" onClick={() => removeFile(file.name)} className={styles.deleteButton}>
                                                <FaTrash />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
                            <label className={styles.formLabel}>Pinpoint Location with GPS (Optional)</label>
                            <button type="button" onClick={handleGetLocation} className={`${appStyles.btn} ${appStyles.btnSecondary}`}>
                                <FaMapMarkerAlt /> Use My Current Location
                            </button>
                            {locationStatus && <p className={styles.locationStatus}>{locationStatus}</p>}
                        </div>
                    </div>
                    <button type="submit" className={`${appStyles.btn} ${appStyles.btnEmergency} ${appStyles.btnFullWidth}`} disabled={isSubmitting}>
                        {isSubmitting ? <FaSpinner className={appStyles.spinner} /> : 'Submit Emergency Report'}
                    </button>
                </form>
            </div>
            <SignUpModal isOpen={isModalOpen} onClose={closeModal}>
                <div className={appStyles.successModal}>
                    <div className={appStyles.successModalIcon}>✔</div>
                    <h2 className={appStyles.successModalTitle}>Report Submitted</h2>
                    <p className={appStyles.successModalMessage}>{modalMessage}</p>
                    <button onClick={closeModal} className={`${appStyles.btn} ${appStyles.btnPrimary}`}>
                        OK
                    </button>
                </div>
            </SignUpModal>
        </>
    );
};

export default ReportIncidentPage;