// File: pawsome-client-react/src/pages/incident/IncidentDetailPage.jsx

import React, { useState, useEffect, useMemo, useCallback } from 'react'; // Added useCallback
import { useParams, useNavigate, Link } from 'react-router-dom';
import styles from './IncidentDetailPage.module.css';
import {
    FaArrowLeft, FaSpinner, FaCopy, FaHeart, FaRegHeart,
    FaUser, FaPhone, FaPaw, FaClock, FaMapMarkerAlt, FaInfoCircle, FaImages,
    FaUsers, FaHistory, FaTrash, FaUndo, FaClipboard, FaBriefcaseMedical,
    FaCog // <-- Import the Gear icon
} from 'react-icons/fa';
import { jwtDecode } from 'jwt-decode';
import CloseIncidentModal from "../../components/common/CloseIncidentModal.jsx";
import TeamDetailsModal from "./components/TeamDetailsModal.jsx";
import IncidentHistoryModal from "./components/IncidentHistoryModal.jsx";
import ArchiveConfirmationModal from "../../components/common/ArchiveConfirmationModal.jsx";
import TeamItemsListModal from "./components/TeamItemsListModal.jsx";
import UnauthorizedModal from '../../components/common/UnauthorizedModal.jsx';
import UpdateIncidentModal from "./components/UpdateIncidentModal.jsx"; // <-- Import the new modal

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// A helper function for robust copying to clipboard (keep as is)
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


const IncidentDetailPage = ({ token }) => {
    const { incidentId } = useParams();
    const navigate = useNavigate();
    const [incident, setIncident] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateMessage, setUpdateMessage] = useState('');
    const [isCopied, setIsCopied] = useState(false);
    const [isDetailsCopied, setIsDetailsCopied] = useState(false);
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
    const [teamDetails, setTeamDetails] = useState(null);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [incidentHistory, setIncidentHistory] = useState(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isTeamItemsModalOpen, setIsTeamItemsModalOpen] = useState(false);
    const [isUnauthorizedModalOpen, setIsUnauthorizedModalOpen] = useState(false);
    const [unauthorizedMessage, setUnauthorizedMessage] = useState('');
    const [isInterested, setIsInterested] = useState(false);
    const [interestLoading, setInterestLoading] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState(null);
    const [userRoles, setUserRoles] = useState([]);

    // --- State for the new Update Incident Modal ---
    const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
    // --- End State ---

    // Decode token and set user roles (keep as is)
    useEffect(() => {
        // ... (useEffect for decoding token remains the same)
        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                setLoggedInUser({
                    id: decodedToken.id,
                    firstName: decodedToken.firstName
                });
                setUserRoles(decodedToken.roles || []);
            } catch (e) {
                console.error("Failed to decode token", e);
                setUserRoles([]);
            }
        } else {
            setUserRoles([]);
        }
    }, [token]);

    // Use useCallback for fetchIncident to prevent re-creation
    const fetchIncident = useCallback(async () => {
        // Ensure loggedInUser is set before fetching
        if (!token || !incidentId) return;

        setLoading(true);
        setError(null); // Clear previous errors
        try {
            const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                const data = await response.json();
                setIncident(data);
                // Check interest status using the fetched incident data and loggedInUser state
                if (data.interestedUsers && loggedInUser) {
                    const userIsInterested = data.interestedUsers.some(user => user.id === loggedInUser.id);
                    setIsInterested(userIsInterested);
                }
            } else {
                const errorText = await response.text();
                console.error("Failed to fetch incident. Server responded with:", response.status, errorText);
                setError(`Failed to fetch incident (Status: ${response.status}). Check console for details.`);
            }
        } catch (err) {
            console.error("Network error fetching incident:", err);
            setError('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    }, [incidentId, token, loggedInUser]); // Add loggedInUser dependency

    // Separate useEffect to check interest once loggedInUser is set (keep as is)
    useEffect(() => {
        // ... (useEffect for checking interest remains the same)
        if (incident && loggedInUser && incident.interestedUsers) {
            const userIsInterested = incident.interestedUsers.some(user => user.id === loggedInUser.id);
            setIsInterested(userIsInterested);
        }
    }, [loggedInUser, incident]);


    const fetchTeamDetails = useCallback(async () => { // Make this useCallback too
        if (teamDetails) return teamDetails; // Return cached details if available
        try {
            const response = await fetch(`${API_BASE_URL}/api/incidents/${incidentId}/assignment/team`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setTeamDetails(data);
                return data;
            } else {
                throw new Error("Could not fetch team details.");
            }
        } catch (err) {
            console.error(err);
            alert(err.message);
            return null;
        }
    }, [incidentId, token, teamDetails]); // Add dependencies


    // Fetch incident initially (keep as is)
    useEffect(() => {
        fetchIncident();
    }, [fetchIncident]); // fetchIncident is now stable


    // --- Role check helper (keep as is) ---
    const hasCaptainOrHigherRole = useCallback(() => {
        return userRoles.includes('ROLE_RESCUE_CAPTAIN') ||
            userRoles.includes('ROLE_ADMIN') ||
            userRoles.includes('ROLE_SUPER_ADMIN');
    }, [userRoles]);


    // --- Other handlers (handleCopyDetails, handleInterestToggle, etc.) remain the same ---
    // ... handleCopyDetails ...
    // ... handleInterestToggle ...
    // ... handleCopyContact ...
    // ... handleUpdateLocation ...
    // ... handleResolveClick & handleMarkAsResolved ...
    // ... handleCloseClick & handleCloseIncident ...
    // ... handleViewTeam ...
    // ... handleViewKits ...
    // ... handleViewHistory ...
    // ... handleReactivateClick & handleReactivate ...
    // ... handleDeleteClick & handleDelete ...
    // ... formatDateTime ...
    const handleCopyDetails = async () => {
        const currentTeamDetails = await fetchTeamDetails();
        if (!incident || !currentTeamDetails) return;
        const teamMembers = currentTeamDetails.teamMembers
            .map(member => `- @${member.fullName}`)
            .join('\n');
        const formattedDetails = `
🚨 RESCUE ALERT 🚨

🔹 Incident ID: ${incident.id}
🐾 Animal: ${incident.animalType}

👤 Informer Details:
  - Name: ${incident.informerName}
  - Contact: ${incident.contactNumber}

📍 Location:
${incident.location}

📝 Description:
${incident.description}

------------------------------------

👥 Assigned Team: ${currentTeamDetails.teamName}
Members:
${teamMembers}

Please coordinate and proceed to the location. Thank you! 🙏
        `.trim();
        copyToClipboard(formattedDetails).then(() => {
            setIsDetailsCopied(true);
            setTimeout(() => setIsDetailsCopied(false), 2000);
        }).catch(err => {
            console.error('Failed to copy details: ', err);
            alert('Failed to copy details. Please try again.');
        });
    };
    const handleInterestToggle = async () => {
        if (!loggedInUser) return;
        setInterestLoading(true);
        const method = isInterested ? 'DELETE' : 'POST';
        try {
            const response = await fetch(`${API_BASE_URL}/api/incidents/${incident.id}/interest`, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                setIsInterested(!isInterested);
                if (loggedInUser) {
                    setIncident(prev => {
                        let updatedInterestedUsers = prev.interestedUsers || [];
                        if (!isInterested) {
                            updatedInterestedUsers = [...updatedInterestedUsers, { id: loggedInUser.id, firstName: loggedInUser.firstName }];
                        } else {
                            updatedInterestedUsers = updatedInterestedUsers.filter(user => user.id !== loggedInUser.id);
                        }
                        return { ...prev, interestedUsers: updatedInterestedUsers };
                    });
                }
            } else {
                console.error("Failed to update interest.");
                alert("Failed to update interest status. Please try again.");
            }
        } catch (err) {
            console.error("Error updating interest:", err);
            alert("Network error updating interest status. Please try again.");
        } finally {
            setInterestLoading(false);
        }
    };
    const handleCopyContact = () => {
        if (incident?.contactNumber) {
            copyToClipboard(incident.contactNumber).then(() => {
                setIsCopied(true);
                setTimeout(() => setIsCopied(false), 2000);
            }).catch(err => {
                console.error('Failed to copy contact: ', err);
                alert('Failed to copy contact. Please try again.');
            });
        }
    };
    const handleUpdateLocation = () => {
        if (!navigator.geolocation) {
            setUpdateMessage('Geolocation is not supported by your browser.');
            return;
        }
        setIsUpdating(true);
        setUpdateMessage('Getting your location...');
        navigator.geolocation.getCurrentPosition(async (position) => {
            const { latitude, longitude } = position.coords;
            setUpdateMessage('Location found. Updating incident...');
            try {
                const response = await fetch(`${API_BASE_URL}/api/incidents/${incident.id}/location`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ latitude, longitude }),
                });
                if (response.ok) {
                    const updatedIncident = await response.json();
                    setIncident(updatedIncident);
                    setUpdateMessage('Location updated successfully!');
                } else {
                    throw new Error('Failed to update location on the server.');
                }
            } catch (err) {
                console.error(err);
                setUpdateMessage('Error updating location. Please try again.');
            } finally {
                setIsUpdating(false);
                setTimeout(() => setUpdateMessage(''), 3000);
            }
        }, (error) => {
            console.error("Geolocation error:", error);
            setUpdateMessage('Unable to retrieve location. Please check your browser permissions.');
            setIsUpdating(false);
            setTimeout(() => setUpdateMessage(''), 3000);
        });
    };
    const handleMarkAsResolved = async () => {
        setIsUpdating(true);
        setUpdateMessage('Updating status to Resolved...');
        try {
            const response = await fetch(`${API_BASE_URL}/api/incidents/${incident.id}/resolve`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                await fetchIncident();
                setUpdateMessage('Incident has been marked as Resolved!');
            } else {
                const errorData = await response.text();
                throw new Error(errorData || 'Failed to update status.');
            }
        } catch (err) {
            console.error(err);
            setUpdateMessage(`Error: ${err.message}`);
        } finally {
            setIsUpdating(false);
            setTimeout(() => setUpdateMessage(''), 3000);
        }
    };
    const handleResolveClick = () => {
        if (hasCaptainOrHigherRole()) {
            handleMarkAsResolved();
        } else {
            setUnauthorizedMessage('You need to be a Rescue Captain or higher to resolve this incident.');
            setIsUnauthorizedModalOpen(true);
        }
    };
    const handleCloseIncident = async (reason) => {
        setIsUpdating(true);
        setUpdateMessage('Closing incident...');
        setIsCloseModalOpen(false);
        try {
            const response = await fetch(`${API_BASE_URL}/api/incidents/${incident.id}/close`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason }),
            });
            if (response.ok) {
                await fetchIncident();
                setUpdateMessage('Incident closed successfully.');
            } else {
                const errorData = await response.text();
                throw new Error(errorData || 'Failed to close incident.');
            }
        } catch (err) {
            console.error(err);
            setUpdateMessage(`Error: ${err.message}`);
        } finally {
            setIsUpdating(false);
            setTimeout(() => setUpdateMessage(''), 3000);
        }
    };
    const handleCloseClick = () => {
        if (hasCaptainOrHigherRole()) {
            setIsCloseModalOpen(true);
        } else {
            setUnauthorizedMessage('You need to be a Rescue Captain or higher to close this incident.');
            setIsUnauthorizedModalOpen(true);
        }
    };
    const handleViewTeam = async () => {
        const details = await fetchTeamDetails();
        if (details) {
            setIsTeamModalOpen(true);
        }
    };
    const handleViewKits = async () => {
        setIsTeamItemsModalOpen(true);
    };
    const handleViewHistory = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/incidents/${incident.id}/history`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                const data = await response.json();
                setIncidentHistory(data);
                setIsHistoryModalOpen(true);
            } else {
                throw new Error("Could not fetch incident history.");
            }
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };
    const handleReactivate = async () => {
        setIsUpdating(true);
        setUpdateMessage('Reactivating incident...');
        try {
            const response = await fetch(`${API_BASE_URL}/api/incidents/${incident.id}/reactivate`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                await fetchIncident();
                setUpdateMessage('Incident has been reactivated to ONGOING.');
            } else {
                const errorData = await response.text();
                throw new Error(errorData || 'Failed to reactivate incident.');
            }
        } catch (err) {
            console.error(err);
            setUpdateMessage(`Error: ${err.message}`);
        } finally {
            setIsUpdating(false);
            setTimeout(() => setUpdateMessage(''), 3000);
        }
    };
    const handleReactivateClick = () => {
        if (hasCaptainOrHigherRole()) {
            handleReactivate();
        } else {
            setUnauthorizedMessage('You need to be a Rescue Captain or higher to reactivate this incident.');
            setIsUnauthorizedModalOpen(true);
        }
    };
    const handleDelete = async (shouldArchive) => {
        setIsDeleteModalOpen(false);
        setIsUpdating(true);
        setUpdateMessage('Deleting incident...');
        try {
            const response = await fetch(`${API_BASE_URL}/api/incidents/${incident.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ archive: shouldArchive })
            });
            const resultData = await response.json().catch(() => ({}));
            if (response.ok) {
                setUpdateMessage(resultData.message || 'Incident deleted successfully. Redirecting...');
                setTimeout(() => navigate('/live'), 2000);
            } else {
                throw new Error(resultData.message || 'Failed to delete incident.');
            }
        } catch (err) {
            console.error(err);
            setUpdateMessage(`Error: ${err.message}`);
            setIsUpdating(false);
            setTimeout(() => setUpdateMessage(''), 3000);
        }
    };
    const handleDeleteClick = () => {
        if (hasCaptainOrHigherRole()) {
            setIsDeleteModalOpen(true);
        } else {
            setUnauthorizedMessage('You need to be a Rescue Captain or higher to delete this incident.');
            setIsUnauthorizedModalOpen(true);
        }
    };
    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return 'N/A';
        const date = new Date(dateTimeString);
        return date.toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        }) + ', ' + date.toLocaleTimeString('en-US', {
            hour: 'numeric', minute: '2-digit', hour12: true
        });
    };
    // --- End Handlers ---

    // --- Handlers for the new Update Modal ---
    const handleOpenUpdateModal = () => {
        // Optional: Add permission check here if needed later
        // if (!canEditIncident()) { ... return; }
        setIsUpdateModalOpen(true);
    };

    const handleIncidentUpdateSuccess = (updatedData) => {
        // Optionally update local state immediately with updatedData
        // Or simply refetch from the server for consistency
        fetchIncident(); // Refetch the incident data after successful save
        setUpdateMessage('Incident details updated successfully!');
        setTimeout(() => setUpdateMessage(''), 3000);
    };
    // --- End Update Modal Handlers ---

    // Loading/Error/No Incident states (keep as is)
    if (loading) {
        // ... (loading spinner code remains the same)
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.pawSpinner}>
                    <FaPaw className={styles.pawIcon} />
                </div>
                <p>Loading Incident Details...</p>
            </div>
        );
    }
    if (error) return <div className={styles.pageContainer} style={{ color: 'red' }}>{error}</div>;
    if (!incident) return <div className={styles.pageContainer}>Incident not found.</div>;

    return (
        <div className={styles.pageContainer}>
            <div className={styles.header}>
                <button onClick={() => navigate(-1)} className={styles.backButton}>
                    <FaArrowLeft />
                </button>
                <div className={styles.headerContent}>
                    <h1>Incident #{incident.id}</h1>
                    <div className={styles.tags}>
                        <span className={`${styles.status} ${styles[incident.status.toLowerCase()]}`}>
                            {incident.status.replace('_', ' ')}
                        </span>
                        <span className={styles.animalTag}>
                            <FaPaw /> {incident.animalType}
                        </span>
                    </div>
                </div>

                {/* --- Container for Right-Side Header Buttons --- */}
                <div className={styles.headerActions}> {/* Add this wrapper */}
                    {/* Gear Button to Open Update Modal */}
                    <button onClick={handleOpenUpdateModal} className={styles.settingsButton} title="Edit Incident Details">
                        <FaCog />
                        {/* Optionally add text like <span>Edit</span> */}
                    </button>

                    {/* Conditionally render history button */}
                    {incident.caseCount > 0 ? (
                        <button onClick={handleViewHistory} className={styles.historyButton} title="View Case History">
                            <FaHistory />
                            <span>History</span>
                        </button>
                    ) : (
                        // Render a placeholder div to maintain layout balance if needed, or adjust CSS
                        // <div className={styles.historyButtonPlaceholder} /> // Kept placeholder for layout consistency
                        // OR adjust CSS directly if placeholder is not desired
                        null // Or remove placeholder if layout adjusts well
                    )}
                </div>
                {/* --- End Right-Side Header Buttons Container --- */}
            </div>

            {/* Detail Grid (keep as is) */}
            <div className={styles.detailGrid}>
                {/* ... (Detail Cards remain the same) ... */}
                {/* Informer Card */}
                <div className={styles.detailCard}>
                    <div className={styles.iconWrapper}>
                        <FaUser className={styles.icon} />
                    </div>
                    <div className={styles.cardContent}>
                        <strong>Informer</strong>
                        <p>{incident.informerName}</p>
                    </div>
                </div>
                {/* Contact Card */}
                <div className={styles.detailCard}>
                    <div className={styles.iconWrapper}>
                        <FaPhone className={styles.icon} />
                    </div>
                    <div className={styles.cardContent}>
                        <strong>Contact</strong>
                        <div className={styles.contactGroup}>
                            <a href={`tel:${incident.contactNumber}`}>{incident.contactNumber}</a>
                            <button onClick={handleCopyContact} className={styles.copyButton} title="Copy phone number">
                                {isCopied ? 'Copied!' : <FaCopy />}
                            </button>
                        </div>
                    </div>
                </div>
                {/* Location Card */}
                <div className={`${styles.detailCard} ${styles.fullWidth}`}>
                    <div className={styles.iconWrapper}>
                        <FaMapMarkerAlt className={styles.icon} />
                    </div>
                    <div className={styles.cardContent}>
                        <strong>Location</strong>
                        <p>{incident.location || 'Not yet updated.'}</p>
                    </div>
                </div>
                {/* Reported At Card */}
                <div className={`${styles.detailCard} ${styles.fullWidth}`}>
                    <div className={styles.iconWrapper}>
                        <FaClock className={styles.icon} />
                    </div>
                    <div className={styles.cardContent}>
                        <strong>Reported At</strong>
                        <p>{formatDateTime(incident.reportedAt)}</p>
                    </div>
                </div>
                {/* Description Card */}
                <div className={`${styles.detailCard} ${styles.fullWidth}`}>
                    <div className={styles.iconWrapper}>
                        <FaInfoCircle className={styles.icon} />
                    </div>
                    <div className={styles.cardContent}>
                        <strong>Description</strong>
                        <p>{incident.description}</p>
                    </div>
                </div>
            </div>

            {/* Status update message (keep as is) */}
            {updateMessage && <p className={styles.updateMessage}>{updateMessage}</p>}

            {/* Action Buttons Container (keep as is) */}
            <div className={styles.actionsContainer}>
                {/* ... (All existing action buttons remain the same) ... */}
                {incident.mediaFileCount > 0 && (
                    <Link
                        to={`/incident/${incident.id}/media`}
                        className={`${styles.actionButton} ${styles.mediaButton}`}
                    >
                        <FaImages />
                        <span>View Media ({incident.mediaFileCount})</span>
                    </Link>
                )}
                {incident.latitude && incident.longitude && (
                    <a href={`https://www.google.com/maps?q=${incident.latitude},${incident.longitude}`} target="_blank" rel="noopener noreferrer" className={`${styles.actionButton} ${styles.mapButton}`}>
                        <FaMapMarkerAlt />
                        <span>View on Map</span>
                    </a>
                )}
                {!incident.latitude && !incident.longitude &&
                    (incident.status === 'REPORTED' || incident.status === 'ASSIGNED' || incident.status === 'IN_PROGRESS' || incident.status === 'ONGOING') && (
                        <button onClick={handleUpdateLocation} disabled={isUpdating} className={`${styles.actionButton} ${styles.updateButton}`}>
                            {isUpdating && updateMessage.includes('Location') ? <FaSpinner className={styles.spinner} /> : <FaMapMarkerAlt />}
                            <span>Update Location</span>
                        </button>
                    )}
                {incident.status === 'REPORTED' && (
                    <>
                        <button onClick={handleInterestToggle} disabled={interestLoading} className={`${styles.actionButton} ${styles.interestButton} ${isInterested ? styles.interested : ''}`}>
                            {interestLoading ? <FaSpinner className={styles.spinner}/> : (isInterested ? <FaHeart /> : <FaRegHeart />)}
                            <span>{isInterested ? "Remove Interest" : "I'm Interested"}</span>
                        </button>
                        <Link
                            to={`/incident/${incident.id}/assign`}
                            className={`${styles.actionButton} ${styles.assignButton}`}
                        >
                            <FaUsers />
                            <span>Assign Team</span>
                        </Link>
                        <button onClick={handleCloseClick} className={`${styles.actionButton} ${styles.closeButton}`}>
                            Close Incident
                        </button>
                    </>
                )}
                {incident.status === 'ASSIGNED' && (
                    <>
                        <button onClick={handleViewTeam} className={`${styles.actionButton} ${styles.viewTeamButton}`}>
                            <FaUsers />
                            <span>View Team</span>
                        </button>
                        <button onClick={handleViewKits} className={`${styles.actionButton} ${styles.viewKitsButton}`}>
                            <FaBriefcaseMedical />
                            <span>View Team Kit</span>
                        </button>
                        <button onClick={handleCopyDetails} className={`${styles.actionButton} ${styles.copyDetailsButton}`}>
                            <FaClipboard />
                            <span>{isDetailsCopied ? 'Copied!' : 'Copy Details'}</span>
                        </button>
                        <Link
                            to={`/incident/${incident.id}/assign`}
                            className={`${styles.actionButton} ${styles.assignButton}`}
                        >
                            <FaUsers />
                            <span>Reassign Team</span>
                        </Link>
                    </>
                )}
                {(incident.status === 'IN_PROGRESS') && (
                    <>
                        <button onClick={handleViewTeam} className={`${styles.actionButton} ${styles.viewTeamButton}`}>
                            <FaUsers />
                            <span>View Team</span>
                        </button>
                        <button onClick={handleViewKits} className={`${styles.actionButton} ${styles.viewKitsButton}`}>
                            <FaBriefcaseMedical />
                            <span>View Team Kit</span>
                        </button>
                    </>
                )}
                {incident.status === 'ONGOING' && (
                    <>
                        <button onClick={handleInterestToggle} disabled={interestLoading} className={`${styles.actionButton} ${styles.interestButton} ${isInterested ? styles.interested : ''}`}>
                            {interestLoading ? <FaSpinner className={styles.spinner}/> : (isInterested ? <FaHeart /> : <FaRegHeart />)}
                            <span>{isInterested ? "Remove Interest" : "I'm Interested"}</span>
                        </button>
                        <Link
                            to={`/incident/${incident.id}/assign`}
                            className={`${styles.actionButton} ${styles.assignButton}`}
                        >
                            <FaUsers />
                            <span>Assign Team</span>
                        </Link>
                        <button onClick={handleResolveClick} disabled={isUpdating} className={`${styles.actionButton} ${styles.resolveButton}`}>
                            {isUpdating && updateMessage.includes('Resolved') ? <FaSpinner className={styles.spinner} /> : 'Mark as Resolved'}
                        </button>
                    </>
                )}
                {incident.status === 'RESOLVED' && (
                    <>
                        <button onClick={handleReactivateClick} disabled={isUpdating} className={`${styles.actionButton} ${styles.updateButton}`}>
                            {isUpdating && updateMessage.includes('Reactivating') ? <FaSpinner className={styles.spinner} /> : <FaUndo />}
                            <span>Reactivate</span>
                        </button>
                        <button onClick={handleDeleteClick} disabled={isUpdating} className={`${styles.actionButton} ${styles.deleteButton}`}>
                            <FaTrash />
                            <span>Delete Incident</span>
                        </button>
                    </>
                )}
                {incident.status === 'CLOSED' && (
                    <>
                        <button onClick={handleDeleteClick} disabled={isUpdating} className={`${styles.actionButton} ${styles.deleteButton}`}>
                            <FaTrash />
                            <span>Delete Incident</span>
                        </button>
                    </>
                )}
            </div>

            {/* --- Modals --- */}
            {/* ... (Existing modals remain the same) ... */}
            <CloseIncidentModal
                isOpen={isCloseModalOpen}
                onClose={() => setIsCloseModalOpen(false)}
                onSubmit={handleCloseIncident}
            />
            {teamDetails && (
                <TeamDetailsModal
                    isOpen={isTeamModalOpen}
                    onClose={() => setIsTeamModalOpen(false)}
                    teamDetails={teamDetails}
                />
            )}
            <TeamItemsListModal
                isOpen={isTeamItemsModalOpen}
                onClose={() => setIsTeamItemsModalOpen(false)}
                incidentId={incidentId}
                token={token}
            />
            {incidentHistory && (
                <IncidentHistoryModal
                    isOpen={isHistoryModalOpen}
                    onClose={() => setIsHistoryModalOpen(false)}
                    history={incidentHistory}
                />
            )}
            {isDeleteModalOpen && (
                <ArchiveConfirmationModal
                    message="Deleting an incident (RESOLVED or CLOSED) is permanent. This will remove all associated cases, chats, and media."
                    onConfirm={handleDelete}
                    onCancel={() => setIsDeleteModalOpen(false)}
                    confirmText="Yes, Delete"
                    cancelText="No, Keep It"
                    isProcessing={isUpdating}
                />
            )}
            <UnauthorizedModal
                isOpen={isUnauthorizedModalOpen}
                onClose={() => setIsUnauthorizedModalOpen(false)}
                message={unauthorizedMessage}
            />

            {/* --- Render the new Update Incident Modal --- */}
            <UpdateIncidentModal
                isOpen={isUpdateModalOpen}
                onClose={() => setIsUpdateModalOpen(false)}
                incidentData={incident} // Pass current incident data
                token={token}
                onSaveSuccess={handleIncidentUpdateSuccess} // Pass the success handler
            />
            {/* --- End Modal Rendering --- */}
        </div>
    );
};

export default IncidentDetailPage;