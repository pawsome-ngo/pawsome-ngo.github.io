import React from 'react';
import styles from './AssignmentSuccessModal.module.css';
import { FaCheckCircle } from 'react-icons/fa';

const AssignmentSuccessModal = ({ result, onClose }) => {
    if (!result) return null;

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <div className={styles.header}>
                    <FaCheckCircle className={styles.successIcon} />
                    <h2>Team Assigned Successfully!</h2>
                </div>
                <div className={styles.details}>
                    <p><strong>Case ID:</strong> {result.caseId}</p>
                    <p><strong>Team Name:</strong> {result.teamName}</p>
                    {/*<p><strong>Chat Group ID:</strong> {result.chatGroupId}</p>*/}
                    <div className={styles.members}>
                        <strong>Assigned Members:</strong>
                        <ul>
                            {result.teamMembers.map(member => (
                                <li key={member.userId}>{member.firstName}</li>
                            ))}
                        </ul>
                    </div>
                </div>
                <button onClick={onClose} className={styles.closeButton}>
                    Done
                </button>
            </div>
        </div>
    );
};

export default AssignmentSuccessModal;