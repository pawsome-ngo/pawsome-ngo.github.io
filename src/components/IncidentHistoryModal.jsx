import React from 'react';
import styles from './IncidentHistoryModal.module.css';
import { FaArchive, FaUsers, FaUserCheck, FaFileAlt, FaUserCircle, FaClock, FaVolumeUp } from 'react-icons/fa';

const IncidentHistoryModal = ({ isOpen, onClose, history }) => {
    if (!isOpen) {
        return null;
    }

    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return 'N/A';
        return new Date(dateTimeString).toLocaleString();
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <FaArchive />
                    <h2>Incident History</h2>
                </div>
                <div className={styles.historyContainer}>
                    {history.cases.length > 0 ? (
                        history.cases.map(caseItem => (
                            <div key={caseItem.caseId} className={styles.caseEntry}>
                                <h3>Case #{caseItem.caseId}</h3>
                                <div className={styles.detailItem}>
                                    <FaClock />
                                    <span>Closed On: <strong>{formatDateTime(caseItem.closedAt)}</strong></span>
                                </div>
                                <div className={styles.detailItem}>
                                    <FaUserCheck />
                                    <span>Assigned by: <strong>{caseItem.assignedBy || 'N/A'}</strong></span>
                                </div>
                                <div className={styles.detailItem}>
                                    <FaFileAlt />
                                    <span>Resolution Notes: <em>{caseItem.resolutionNotes || 'No notes provided.'}</em></span>
                                </div>

                                {caseItem.voiceNoteUrl && (
                                    <div className={styles.audioPlayerSection}>
                                        <h4><FaVolumeUp /> Voice Note</h4>
                                        <audio controls src={caseItem.voiceNoteUrl}>
                                            Your browser does not support the audio element.
                                        </audio>
                                    </div>
                                )}

                                <div className={styles.teamSection}>
                                    <h4><FaUsers /> {caseItem.teamName}</h4>
                                    <ul>
                                        {caseItem.teamMembers.map(member => (
                                            <li key={member.userId}><FaUserCircle /> {member.firstName}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>No previous case history found for this incident.</p>
                    )}
                </div>
                <button onClick={onClose} className={styles.closeButton}>
                    Close
                </button>
            </div>
        </div>
    );
};

export default IncidentHistoryModal;