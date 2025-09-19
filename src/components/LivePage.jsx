import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './LivePage.module.css';
import CustomSelect from './CustomSelect';
import { FaDog, FaCat, FaPaw, FaDove } from 'react-icons/fa';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const truncateLocation = (location) => {
    if (!location) return 'Location not available';
    const words = location.split(' ');
    if (words.length > 4) {
        return words.slice(0, 4).join(' ') + '...';
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

const LivePage = ({ token }) => {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [statusFilter, setStatusFilter] = useState('LIVE');

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
                    const data = await response.json();
                    if (statusFilter !== 'ALL' && statusFilter !== 'LIVE') {
                        setIncidents(data.filter(incident => incident.status === statusFilter));
                    } else {
                        setIncidents(data);
                    }
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
    }, [token, statusFilter]);

    const statusOptions = [
        { value: 'LIVE', label: 'Live' },
        { value: 'ALL', label: 'All Statuses' },
        { value: 'REPORTED', label: 'Reported' },
        { value: 'ASSIGNED', label: 'Assigned' },
        { value: 'IN_PROGRESS', label: 'In Progress' },
        { value: 'ONGOING', label: 'Ongoing' },
        { value: 'RESOLVED', label: 'Resolved' },
        { value: 'CLOSED', label: 'Closed' }
    ];

    if (loading) return <div className={styles.container}>Loading incidents...</div>;
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
                {incidents.map(incident => (
                    <Link
                        to={`/incident/${incident.id}`}
                        key={incident.id}
                        className={`${styles.card} ${styles[incident.status.toLowerCase()]}`}
                    >
                        {incident.caseCount > 0 && (
                            <div className={styles.caseCount}>
                                {incident.caseCount}
                            </div>
                        )}
                        <div className={styles.cardIcon}>
                            <AnimalIcon type={incident.animalType} />
                        </div>
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
                    </Link>
                ))}
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