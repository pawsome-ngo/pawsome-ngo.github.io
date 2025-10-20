// File: pawsome-ngo/full/full-d91a39b5e3886f03789eb932561a5689b5f95888/pawsome-frontend-code-react/src/pages/incident/LivePage.jsx

import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from './LivePage.module.css';
import CustomSelect from '../../components/common/CustomSelect.jsx';
// FaExclamationTriangle removed if not used elsewhere
import { FaDog, FaCat, FaPaw, FaDove, FaClock } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// --- Helper functions (truncateLocation, AnimalIcon, needsAttention, formatTimeAgo) ---
const truncateLocation = (location) => {
    if (!location) return 'Location not available';
    const words = location.split(' ');
    if (words.length > 6) {
        return words.slice(0, 6).join(' ') + '...';
    }
    return location;
};

const AnimalIcon = ({ type }) => {
    switch (type) {
        case 'DOG': return <FaDog />;
        case 'CAT': return <FaCat />;
        case 'BIRD': return <FaDove />;
        default: return <FaPaw />;
    }
};

const needsAttention = (status, lastUpdatedString) => {
    if (!lastUpdatedString) return false;
    const lastUpdatedDate = new Date(lastUpdatedString);
    const now = new Date();

    if (status === 'REPORTED') {
        const threeDaysAgo = new Date(now);
        threeDaysAgo.setDate(now.getDate() - 3);
        return lastUpdatedDate < threeDaysAgo;
    } else if (status === 'ONGOING') {
        const sevenDaysAgo = new Date(now);
        sevenDaysAgo.setDate(now.getDate() - 7);
        return lastUpdatedDate < sevenDaysAgo;
    }
    return false;
};

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
    const hours = Math.floor((seconds % 86400) / 3600);
    if (interval >= 1) {
        let str = interval + (interval === 1 ? " day" : " days");
        if (hours > 0 && interval < 3) {
            str += `, ${hours}${hours === 1 ? ' hr' : ' hrs'}`;
        }
        return str + " ago";
    }

    interval = Math.floor(seconds / 3600); // hours
    const minutes = Math.floor((seconds % 3600) / 60);
    if (interval >= 1) {
        let str = interval + (interval === 1 ? " hour" : " hours");
        if (minutes > 0) {
            str += `, ${minutes}${minutes === 1 ? ' min' : ' mins'}`;
        }
        return str + " ago";
    }

    interval = Math.floor(seconds / 60); // minutes
    if (interval >= 1) return interval + (interval === 1 ? " minute" : " mins") + " ago";

    if (seconds < 10) return "Just now";
    return Math.floor(seconds) + " secs ago";
};
// --- End Helper Functions ---


const LivePage = ({ token }) => {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('LIVE');
    const intervalRef = useRef(null);
    const [, setTimeNow] = useState(Date.now());

    useEffect(() => {
        const fetchIncidents = async () => {
            if (!token) return;

            const endpoint = statusFilter === 'LIVE'
                ? `${API_BASE_URL}/api/incidents/live`
                : `${API_BASE_URL}/api/incidents/summary`;

            setLoading(true);
            try {
                const response = await fetch(endpoint, {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                if (response.ok) {
                    let data = await response.json();

                    if (statusFilter === 'LIVE') {
                        data.sort((a, b) => {
                            const aNeedsAttention = needsAttention(a.status, a.lastUpdated);
                            const bNeedsAttention = needsAttention(b.status, b.lastUpdated);
                            if (aNeedsAttention && !bNeedsAttention) return -1;
                            if (!aNeedsAttention && bNeedsAttention) return 1;
                            if (a.status === 'REPORTED' && b.status !== 'REPORTED') return -1;
                            if (a.status !== 'REPORTED' && b.status === 'REPORTED') return 1;
                            return 0;
                        });
                        setIncidents(data);
                    } else if (statusFilter !== 'ALL') {
                        setIncidents(data.filter(incident => incident.status === statusFilter));
                    } else {
                        setIncidents(data);
                    }
                    setError(null);
                } else {
                    setError('Failed to fetch incidents.');
                }
            } catch (err) {
                setError('Could not connect to the server.');
            } finally {
                setLoading(false);
            }
        };

        fetchIncidents();

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(() => {
            setTimeNow(Date.now());
        }, 60000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [token, statusFilter]);

    const statusOptions = [
        { value: 'LIVE', label: 'Live' },
        { value: 'ALL', label: 'All' },
        { value: 'REPORTED', label: 'Reported' },
        { value: 'ASSIGNED', label: 'Assigned' },
        { value: 'IN_PROGRESS', label: 'In Progress' },
        { value: 'ONGOING', label: 'Ongoing' },
        { value: 'RESOLVED', label: 'Resolved' },
        { value: 'CLOSED', label: 'Closed' }
    ];

    if (loading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.pawSpinner}>
                    <FaPaw className={styles.pawIcon} />
                </div>
                <p>Loading Incidents...</p>
            </div>
        );
    }

    if (error) return <div className={styles.container} style={{ color: 'red' }}>{error}</div>;

    return (
        <div className={styles.container}>
            <header className={styles.pageHeader}>
                <h1>Live Incidents</h1>
            </header>

            <div className={styles.filterContainer}>
                <div className={styles.customSelectWrapper}>
                    <CustomSelect
                        name="statusFilter"
                        options={statusOptions}
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.cardGrid}>
                {incidents.map(incident => {
                    const attentionNeeded = needsAttention(incident.status, incident.lastUpdated);
                    const timeAgo = formatTimeAgo(incident.lastUpdated || incident.reportedAt);

                    return (
                        <Link
                            to={`/incident/${incident.id}`}
                            key={incident.id}
                            className={`${styles.card} ${styles[incident.status.toLowerCase()]} ${attentionNeeded ? styles.overdue : ''}`}
                        >
                            <div className={styles.cardIcon}>
                                <AnimalIcon type={incident.animalType} />
                            </div>

                            {/* Conditionally render ATTENTION text - centered */}
                            {attentionNeeded && (
                                <div className={styles.attentionIndicator} title="Needs attention!">
                                    ATTENTION!
                                </div>
                            )}

                            {incident.caseCount > 0 && (
                                <div className={styles.caseCount}>
                                    {incident.caseCount}
                                </div>
                            )}

                            <div className={styles.cardContent}>
                                <div className={styles.cardHeader}>
                                    <h2>Incident #{incident.id}</h2>
                                    <span className={styles.statusTag}>
                                        {incident.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <p><strong>Informer:</strong> {incident.informerName}</p>
                                <p className={styles.locationText}>
                                    {truncateLocation(incident.location)}
                                </p>
                            </div>
                            <div className={styles.cardFooter}>
                                <div className={styles.timeAgoIndicator}>
                                    <FaClock />
                                    <span>{timeAgo}</span>
                                </div>
                            </div>
                        </Link>
                    );
                })}
            </div>
            {incidents.length === 0 && !loading && (
                <div className={styles.noIncidents}>
                    <h2>No Incidents Found</h2>
                    <p>There are no incidents matching the selected filter.</p>
                </div>
            )}
        </div>
    );
};

export default LivePage;