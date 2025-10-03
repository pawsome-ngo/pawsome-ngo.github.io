import React from 'react';
import styles from './TeamDetailsModal.module.css';
import { FaUsers, FaUserCircle, FaUserCheck } from 'react-icons/fa';

const TeamDetailsModal = ({ isOpen, onClose, teamDetails }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <FaUsers />
                    <h2>{teamDetails.teamName}</h2>
                </div>
                {teamDetails.assignedBy && (
                    <div className={styles.assignedBy}>
                        <FaUserCheck />
                        <span>Assigned by: <strong>{teamDetails.assignedBy}</strong></span>
                    </div>
                )}
                <ul className={styles.memberList}>
                    {teamDetails.teamMembers.map(member => (
                        <li key={member.userId} className={styles.memberItem}>
                            <FaUserCircle />
                            <span>{member.firstName}</span>
                        </li>
                    ))}
                </ul>
                <button onClick={onClose} className={styles.closeButton}>
                    Close
                </button>
            </div>
        </div>
    );
};

export default TeamDetailsModal;