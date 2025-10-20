import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './NotificationItem.module.css'; // Ensure CSS module is imported
import { FaUserCircle, FaExclamationCircle, FaCheckCircle, FaGift, FaInfoCircle, FaBoxOpen, FaTrash } from 'react-icons/fa';

// Helper function to format time (reuse or keep here)
const formatTimeAgo = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    let interval = Math.floor(seconds / 31536000);
    if (interval >= 1) return interval + (interval === 1 ? " year" : " yrs") + " ago";

    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) return interval + (interval === 1 ? " month" : " mths") + " ago";

    interval = Math.floor(seconds / 86400); // days
    if (interval >= 1) return interval + (interval === 1 ? " day" : " days") + " ago";

    interval = Math.floor(seconds / 3600); // hours
    if (interval >= 1) return interval + (interval === 1 ? " hour" : " hrs") + " ago";

    interval = Math.floor(seconds / 60); // minutes
    if (interval >= 1) return interval + (interval === 1 ? " minute" : " mins") + " ago";

    if (seconds < 10) return "Just now";
    return Math.floor(seconds) + " secs ago";
};

const getIconForType = (type) => {
    switch(type) {
        case 'INCIDENT': return <FaExclamationCircle />;
        case 'INVENTORY': return <FaBoxOpen />;
        case 'APPROVAL': return <FaCheckCircle />;
        case 'REWARDS': return <FaGift />;
        case 'GENERAL':
        default: return <FaInfoCircle />;
    }
};

// Helper function to convert status to camelCase
const statusToCamelCase = (statusString) => {
    if (!statusString) return '';
    const parts = statusString.toLowerCase().split('_');
    return parts.map((part, index) =>
        index === 0 ? part : part.charAt(0).toUpperCase() + part.slice(1)
    ).join(''); // e.g., IN_PROGRESS -> inProgress
};

const NotificationItem = ({ notification, onMarkRead, onDelete }) => {
    // Console log for debugging
    // console.log("Rendering Notification:", notification);

    const navigate = useNavigate();
    const timeAgo = formatTimeAgo(notification.createdAt);

    // Determine status class for styling (Using camelCase)
    let backgroundClass = '';
    if (notification.type === 'INCIDENT' && notification.incidentStatus) {
        const camelCaseStatus = statusToCamelCase(notification.incidentStatus); // Convert
        // Check if the specific status style exists in the CSS module
        if (styles[camelCaseStatus]) {
            backgroundClass = styles[camelCaseStatus];
        } else {
            // Fallback to general incident type if specific status style not found
            backgroundClass = styles.type_incident;
            // console.warn(`CSS module style not found for incident status: ${camelCaseStatus}`); // Optional warning
        }
    } else {
        // Fallback to general type class for non-incident types or missing status
        const typeClassName = `type_${notification.type.toLowerCase()}`;
        backgroundClass = styles[typeClassName] || styles.type_general; // Default to general if type unknown
        // if (!styles[typeClassName]) {
        // console.warn(`CSS module style not found for notification type: ${typeClassName}`); // Optional warning
        // }
    }


    const handleItemClick = (e) => {
        // Prevent navigation if the delete button was clicked
        if (e.target.closest(`.${styles.deleteButton}`)) {
            return;
        }

        if (!notification.isRead) {
            onMarkRead(notification.id);
        }
        if (notification.type === 'INCIDENT' && notification.relatedEntityId) {
            navigate(`/incident/${notification.relatedEntityId}`);
        }
        // ... other navigation ...
    };

    // Handler for delete button click
    const handleDeleteClick = (e) => {
        e.stopPropagation(); // Prevent handleItemClick from firing
        onDelete(notification.id); // Call the handler passed from parent
    };


    return (
        <div
            // Apply the determined background class
            className={`${styles.notificationItem} ${backgroundClass} ${notification.isRead ? styles.read : styles.unread}`}
            onClick={handleItemClick} // Renamed main click handler
        >
            <div className={styles.iconWrapper}>
                {getIconForType(notification.type)}
            </div>
            <div className={styles.contentWrapper}>
                <p className={styles.message}>{notification.message}</p>
                {notification.triggeringUserName && (
                    <p className={styles.triggerUser}><FaUserCircle /> by {notification.triggeringUserName}</p>
                )}
                <p className={styles.time}>{timeAgo}</p>
            </div>
            {!notification.isRead && <div className={styles.unreadDot} title="Unread"></div>}

            {/* Add Delete Button */}
            <button
                className={styles.deleteButton}
                onClick={handleDeleteClick}
                title="Delete notification"
                aria-label="Delete notification"
            >
                <FaTrash />
            </button>
            {/* End Delete Button */}
        </div>
    );
};

export default NotificationItem;