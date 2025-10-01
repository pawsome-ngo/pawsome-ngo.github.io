import React, { useState, useEffect } from 'react';
import styles from './InventoryActivityModal.module.css';
import { FaTimes, FaSpinner } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const InventoryActivityModal = ({ token, onClose }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/inventory/logs`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    throw new Error('Failed to fetch activity logs.');
                }
                const data = await response.json();
                setLogs(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchLogs();
    }, [token]);

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}><FaTimes /></button>
                <h2>Recent Inventory Activity</h2>
                {loading && <div className={styles.centered}><FaSpinner className={styles.spinner} /></div>}
                {error && <p className={styles.error}>{error}</p>}
                {!loading && !error && (
                    <ul className={styles.logList}>
                        {logs.map(log => (
                            <li key={log.id} className={styles.logItem}>
                                <p><strong>Action:</strong> {log.action.replace('_', ' ')}</p>
                                <p><strong>Item:</strong> {log.itemName} (x{log.quantity})</p>
                                <p><strong>User:</strong> {log.userName || 'N/A'}</p>
                                {log.approvedByUserName && <p><strong>Approved By:</strong> {log.approvedByUserName}</p>}
                                <p className={styles.timestamp}>{formatTimestamp(log.timestamp)}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default InventoryActivityModal;