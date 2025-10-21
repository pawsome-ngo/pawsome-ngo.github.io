import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaMicrophone, FaStop, FaTrash, FaFileAlt, FaMapMarkerAlt, FaSpinner } from 'react-icons/fa';
import imageCompression from 'browser-image-compression';
import CustomSelect from '../../components/common/CustomSelect.jsx';
import SignUpModal from '../../components/common/SignUpModal.jsx';
import styles from './ReportIncidentPage.module.css';
import appStyles from '../../App.module.css'; // Keep appStyles for button styling

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
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMessage, setModalMessage] = useState('');
    const [formErrors, setFormErrors] = useState({});


    // State for audio recording
    const [isRecording, setIsRecording] = useState(false);
    const [audioURL, setAudioURL] = useState('');
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);

    const validatePhoneNumber = (number) => {
        if (!/^\d{10}$/.test(number)) {
            setFormErrors(prev => ({ ...prev, contactNumber: 'Phone number must be 10 digits.' }));
        } else {
            setFormErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.contactNumber;
                return newErrors;
            });
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
        if (name === 'contactNumber') {
            validatePhoneNumber(value);
        }
    };

    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setLocationStatus(`Compressing 1 of ${files.length} file(s)...`);

        const compressionOptions = {
            maxSizeMB: 0.8,
            maxWidthOrHeight: 1280,
            useWebWorker: true,
            fileType: 'image/jpeg',
            quality: 0.7,
        };

        const processedFiles = [];
        let count = 0;
        for (const file of files) {
            count++;
            setLocationStatus(`Compressing ${count} of ${files.length} file(s)...`);

            if (file.type.startsWith('image/')) {
                try {
                    const compressedFile = await imageCompression(file, compressionOptions);
                    const newFileName = file.name.substring(0, file.name.lastIndexOf('.')) + '.jpg';
                    const newFile = new File([compressedFile], newFileName, {
                        type: 'image/jpeg',
                        lastModified: file.lastModified,
                    });
                    processedFiles.push(newFile);
                } catch (error) {
                    console.error("Image compression failed, adding original file:", error);
                    processedFiles.push(file);
                }
            } else {
                processedFiles.push(file);
            }
        }

        setMediaFiles(prevFiles => [...prevFiles, ...processedFiles]);
        setLocationStatus(`Added ${processedFiles.length} file(s).`);
        setTimeout(() => setLocationStatus(''), 3000);
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

    // --- Using XMLHttpRequest for Progress ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (Object.keys(formErrors).length > 0) {
            return;
        }
        setIsSubmitting(true);
        setUploadProgress(0); // Reset progress

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

        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_BASE_URL}/api/incidents/report`);

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                setUploadProgress(Math.round(percentComplete));
            }
        };

        xhr.onload = () => {
            setIsSubmitting(false);
            setUploadProgress(0);

            let result;
            try {
                result = JSON.parse(xhr.responseText);
            } catch (parseError) {
                setModalMessage('An unexpected error occurred. Please try again.');
                setIsModalOpen(true);
                return;
            }

            if (xhr.status >= 200 && xhr.status < 300) {
                setModalMessage(result.message || 'Incident reported successfully!');
                setIsModalOpen(true);
            } else {
                setModalMessage(result.message || 'Failed to report incident.');
                setIsModalOpen(true);
            }
        };

        xhr.onerror = () => {
            setIsSubmitting(false);
            setUploadProgress(0);
            setModalMessage('Could not connect to the server. Please check your connection and try again.');
            setIsModalOpen(true);
        };

        xhr.send(data);
    };
    // --- End handleSubmit ---

    const closeModal = () => {
        setIsModalOpen(false);
        navigate('/'); // Redirect after closing success modal
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
                        {/* --- Form Fields (Name, Contact, Location, etc.) --- */}
                        <div className={styles.formGroup}>
                            <label htmlFor="informerName" className={styles.formLabel}>Your Name</label>
                            <input type="text" id="informerName" name="informerName" className={styles.formInput} value={formData.informerName} onChange={handleChange} required />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="contactNumber" className={styles.formLabel}>Contact Number</label>
                            <input type="tel" id="contactNumber" name="contactNumber" className={styles.formInput} value={formData.contactNumber} onChange={handleChange} required />
                            {formErrors.contactNumber && <p className={styles.errorText}>{formErrors.contactNumber}</p>}
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

                        {/* --- File Upload Section --- */}
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
                            {/* --- ✨ Add Patience Message --- */}
                            <p className={styles.patienceMessage}>
                                Large files may take time to compress & upload. Please be patient.
                            </p>
                        </div>

                        {/* --- File List --- */}
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

                        {/* --- Location Section --- */}
                        <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
                            <label className={styles.formLabel}>Pinpoint Location with GPS (Optional)</label>
                            <button type="button" onClick={handleGetLocation} className={`${appStyles.btn} ${appStyles.btnSecondary}`}>
                                <FaMapMarkerAlt /> Use My Current Location
                            </button>
                            {locationStatus && <p className={styles.locationStatus}>{locationStatus}</p>}
                        </div>
                    </div>

                    {/* --- ✨ Progress Bar --- */}
                    {isSubmitting && (
                        <div className={styles.progressBarContainer}>
                            <div
                                className={styles.progressBar}
                                style={{ width: `${uploadProgress}%` }}
                            >
                                {/* Only show % inside if > 10% and NOT 100% */}
                                {uploadProgress > 10 && uploadProgress < 100 ? `${uploadProgress}%` : ''}
                                {/* Show Processing text only when 100% */}
                                {uploadProgress === 100 ? 'Processing...' : ''}
                            </div>
                            {/* Only show background text if NOT 100% */}
                            {uploadProgress < 100 && (
                                <span className={styles.progressText}>
                                    Uploading...
                                </span>
                            )}
                        </div>
                    )}
                    {/* --- End Progress Bar --- */}

                    <button type="submit" className={`${appStyles.btn} ${appStyles.btnEmergency} ${appStyles.btnFullWidth}`} disabled={isSubmitting || Object.keys(formErrors).length > 0}>
                        {/* --- ✨ Conditional Spinner in Button --- */}
                        {isSubmitting ? <FaSpinner className={appStyles.spinner} /> : 'Submit Emergency Report'}
                        {/* --- End Conditional Spinner --- */}
                    </button>
                </form>
            </div>
            {/* --- Success Modal --- */}
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