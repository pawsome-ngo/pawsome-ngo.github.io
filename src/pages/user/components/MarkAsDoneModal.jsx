import React, { useState, useEffect } from 'react';
import styles from './MarkAsDoneModal.module.css';
import {
    FaMapMarkerAlt, FaSpinner, FaExclamationTriangle, FaClipboard,
    FaToggleOn, FaToggleOff, FaTrash, FaFileAlt // Added FaTrash, FaFileAlt
} from 'react-icons/fa';
import imageCompression from 'browser-image-compression';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// Helper function for copying to clipboard (keep as is)
const copyToClipboard = (text) => {
    // ... (copyToClipboard function remains the same)
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
    const [mediaFiles, setMediaFiles] = useState([]); // This holds the File objects
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [teamDetails, setTeamDetails] = useState(null);
    const [compressImages, setCompressImages] = useState(true);

    const isLocationMissing = incident.latitude === null;

    // Fetch team details (keep as is)
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
        if (incident) { fetchTeamDetails(); }
    }, [incident, token]);


    // Handle Copy Details (keep as is)
    const handleCopyDetails = () => {
        // ... (handleCopyDetails logic remains the same) ...
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

    // Handle Get Location (keep as is)
    const handleGetLocation = () => {
        // ... (handleGetLocation logic remains the same) ...
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

    // Handle File Change (checks compression state - keep as is)
    const handleFileChange = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Reset file input to allow selecting the same file again if removed
        e.target.value = null;

        setFeedback(`Processing ${files.length} file(s)...`);
        const compressionOptions = { maxSizeMB: 0.8, maxWidthOrHeight: 1280, useWebWorker: true, fileType: 'image/jpeg', quality: 0.7 };
        const processedFiles = [];
        let count = 0;

        for (const file of files) {
            count++;
            const isImage = file.type.startsWith('image/');
            if (compressImages && isImage) {
                setFeedback(`Compressing ${count} of ${files.length} image(s)...`);
                try {
                    const compressedFile = await imageCompression(file, compressionOptions);
                    const finalFileToUse = compressedFile.size < file.size ? compressedFile : file;
                    const newFileName = finalFileToUse === compressedFile ? file.name.substring(0, file.name.lastIndexOf('.')) + '.jpg' : file.name;
                    const newFile = new File([finalFileToUse], newFileName, { type: finalFileToUse === compressedFile ? 'image/jpeg' : file.type, lastModified: file.lastModified });
                    processedFiles.push(newFile);
                    console.log(`Compressed ${file.name} to ${newFileName} (${(newFile.size / 1024 / 1024).toFixed(2)} MB)`);
                } catch (error) {
                    console.error("Image compression failed, adding original file:", error);
                    processedFiles.push(file);
                    setFeedback(`Compression failed for ${file.name}, adding original.`);
                }
            } else {
                setFeedback(`Adding file ${count} of ${files.length}...`);
                processedFiles.push(file);
                console.log(`Adding original file: ${file.name} (Compression ${isImage ? 'disabled' : 'not applicable'})`);
            }
        }

        // Add only new files, preventing duplicates by name (simple check)
        setMediaFiles(prevFiles => {
            const existingNames = new Set(prevFiles.map(f => f.name));
            const newFilesToAdd = processedFiles.filter(f => !existingNames.has(f.name));
            return [...prevFiles, ...newFilesToAdd];
        });

        setFeedback(`Added ${processedFiles.length} file(s).`);
        setTimeout(() => setFeedback(''), 3000);
    };

    // --- Function to Remove a Selected File ---
    const handleRemoveFile = (fileNameToRemove) => {
        setMediaFiles(prevFiles => prevFiles.filter(file => file.name !== fileNameToRemove));
        setFeedback(`Removed ${fileNameToRemove}.`);
        setTimeout(() => setFeedback(''), 2000); // Clear feedback
    };
    // --- End Remove File Function ---

    // Handle Submit (keep as is)
    const handleSubmit = async (e) => {
        // ... (handleSubmit logic remains the same) ...
        e.preventDefault();
        setIsSubmitting(true);
        setFeedback('Submitting...');
        const formData = new FormData();
        const details = { resolutionNotes, finalLatitude: finalLocation?.latitude, finalLongitude: finalLocation?.longitude };
        formData.append('details', new Blob([JSON.stringify(details)], { type: 'application/json' }));
        mediaFiles.forEach(file => { formData.append('mediaFiles', file); });
        try {
            const response = await fetch(`${API_BASE_URL}/api/cases/${incident.id}/close`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: formData });
            if (response.ok) {
                setFeedback('Case completed successfully!');
                setTimeout(() => { onCaseCompleted(incident.id); onClose(); }, 1500);
            } else {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to complete the case.');
            }
        } catch (err) {
            console.error(err);
            setFeedback(`An error occurred: ${err.message}`);
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <h2>Complete Case #{incident.id}</h2>
                <form onSubmit={handleSubmit}>
                    {/* Resolution Notes (keep as is) */}
                    <div className={styles.formGroup}>
                        <label htmlFor="resolutionNotes">Resolution Notes</label>
                        <textarea id="resolutionNotes" value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="e.g., Animal was given first aid and taken to the shelter." rows="4" required />
                    </div>

                    {/* Final Location (keep as is) */}
                    <div className={styles.formGroup}>
                        <label>Final Location</label>
                        {isLocationMissing && (<div className={styles.locationWarning}><FaExclamationTriangle /><span>The incident location isn't set. Update it now if at the scene.</span></div>)}
                        <button type="button" onClick={handleGetLocation} className={`${styles.locationButton} ${isLocationMissing ? styles.highlightButton : ''}`}><FaMapMarkerAlt /> Update to Current Location</button>
                    </div>

                    {/* Media Files Input (keep as is) */}
                    <div className={styles.formGroup}>
                        <label htmlFor="mediaFiles">Add Final Photos/Videos (Optional)</label>
                        <input type="file" id="mediaFiles" multiple onChange={handleFileChange} accept="image/*,video/*,audio/*"/>
                    </div>

                    {/* --- Display Selected Files with Delete Buttons --- */}
                    {mediaFiles.length > 0 && (
                        <div className={styles.formGroup}>
                            <label>Files Selected:</label>
                            <ul className={styles.fileList}>
                                {mediaFiles.map((file, index) => (
                                    <li key={index} className={styles.fileListItem}>
                                        <FaFileAlt className={styles.fileIcon} />
                                        <span className={styles.fileName} title={file.name}>{file.name}</span>
                                        {/* Delete Button */}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveFile(file.name)}
                                            className={styles.fileDeleteButton}
                                            aria-label={`Remove ${file.name}`}
                                            disabled={isSubmitting}
                                        >
                                            <FaTrash />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {/* --- End Display Files --- */}


                    {/* Compression Toggle (keep as is, condition checks mediaFiles state) */}
                    {mediaFiles.some(file => file.type.startsWith('image/')) && (
                        <div className={`${styles.formGroup} ${styles.toggleGroup}`}>
                            <label>Compress Images?</label>
                            <button type="button" onClick={() => setCompressImages(prev => !prev)} className={styles.toggleSwitch} aria-pressed={compressImages}>
                                {compressImages ? <FaToggleOn className={styles.toggleOn} /> : <FaToggleOff className={styles.toggleOff} />}
                                <span className={styles.toggleText}>{compressImages ? 'On (Recommended)' : 'Off (Original Quality)'}</span>
                            </button>
                        </div>
                    )}

                    {/* Feedback Area (keep as is) */}
                    <div className={styles.feedbackArea}>
                        {feedback && <p>{feedback}</p>}
                    </div>

                    {/* Action Buttons (keep as is) */}
                    <div className={styles.actions}>
                        <button type="button" onClick={onClose} className={styles.cancelButton} disabled={isSubmitting}>Cancel</button>
                        <button type="button" onClick={handleCopyDetails} className={styles.copyButton} disabled={!resolutionNotes.trim() || !teamDetails || isSubmitting}>
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