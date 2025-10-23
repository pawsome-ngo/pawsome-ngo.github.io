// File: pawsome-client-react/src/pages/incident/IncidentDetailPage.jsx

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import styles from './IncidentDetailPage.module.css';
import {
    FaArrowLeft, FaSpinner, FaCopy, FaHeart, FaRegHeart,
    FaUser, FaPhone, FaPaw, FaClock, FaMapMarkerAlt, FaInfoCircle, FaImages,
    FaUsers, FaHistory, FaTrash, FaUndo, FaClipboard, FaBriefcaseMedical // ✨ ADDED ICON
} from 'react-icons/fa';
import { jwtDecode } from 'jwt-decode';
import CloseIncidentModal from "../../components/common/CloseIncidentModal.jsx";
import TeamDetailsModal from "./components/TeamDetailsModal.jsx";
import IncidentHistoryModal from "./components/IncidentHistoryModal.jsx";
import ArchiveConfirmationModal from "../../components/common/ArchiveConfirmationModal.jsx";
import TeamItemsListModal from "./components/TeamItemsListModal.jsx"; // ✨ IMPORT NEW MODAL

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// A helper function for robust copying to clipboard
const copyToClipboard = (text) => {
    // Modern way: Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
        return navigator.clipboard.writeText(text);
    }
    // Fallback for older browsers
    else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed'; // Avoid scrolling to bottom
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
    const [isTeamItemsModalOpen, setIsTeamItemsModalOpen] = useState(false); // ✨ ADD STATE

    const [isInterested, setIsInterested] = useState(false);
    const [interestLoading, setInterestLoading] = useState(false);
    const [loggedInUser, setLoggedInUser] = useState(null);

    useEffect(() => {
        if (token) {
            try {
                const decodedToken = jwtDecode(token);
                // Extract necessary user info (adjust keys based on your JWT payload)
                setLoggedInUser({
                    id: decodedToken.id, // Assuming 'id' is in the token payload
                    firstName: decodedToken.firstName // Assuming 'firstName' is in the payload
                    // Add other fields if needed
                });
            } catch (e) {
                console.error("Failed to decode token", e);
            }
        }
    }, [token]);

    const fetchIncident = async () => {
        // Ensure loggedInUser is set before fetching
        if (!token || !incidentId || !loggedInUser) return;

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
    };

    const fetchTeamDetails = async () => {
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
    };


    // Fetch incident only when loggedInUser state is updated
    useEffect(() => {
        if (loggedInUser) {
            fetchIncident();
        }
    }, [token, incidentId, loggedInUser]); // Add loggedInUser dependency

    // --- Other handlers (handleCopyDetails, handleInterestToggle, handleCopyContact, etc. remain the same) ---
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
        if (!loggedInUser) return; // Guard against missing user info
        setInterestLoading(true);
        const method = isInterested ? 'DELETE' : 'POST';
        try {
            const response = await fetch(`${API_BASE_URL}/api/incidents/${incident.id}/interest`, {
                method: method,
                headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
                setIsInterested(!isInterested);
                // Optimistically update the interested users array in the local state
                if (loggedInUser) {
                    setIncident(prev => {
                        let updatedInterestedUsers = prev.interestedUsers || [];
                        if (!isInterested) { // If adding interest
                            updatedInterestedUsers = [...updatedInterestedUsers, { id: loggedInUser.id, firstName: loggedInUser.firstName }];
                        } else { // If removing interest
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
                await fetchIncident(); // Re-fetch data
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
                await fetchIncident(); // Re-fetch data
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

    const handleViewTeam = async () => {
        const details = await fetchTeamDetails();
        if (details) {
            setIsTeamModalOpen(true);
        }
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
                await fetchIncident(); // Re-fetch data
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

    const handleDelete = async (shouldArchive) => { // Takes boolean from modal
        setIsDeleteModalOpen(false);
        setIsUpdating(true); // Use isUpdating for loading state
        setUpdateMessage('Deleting incident...');

        try {
            const response = await fetch(`${API_BASE_URL}/api/incidents/${incident.id}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json' // Add Content-Type
                },
                body: JSON.stringify({ archive: shouldArchive }) // Send the archive flag
            });

            const resultData = await response.json().catch(() => ({}));

            if (response.ok) {
                setUpdateMessage(resultData.message || 'Incident deleted successfully. Redirecting...');
                setTimeout(() => navigate('/live'), 2000); // Redirect after message
            } else {
                throw new Error(resultData.message || 'Failed to delete incident.');
            }
        } catch (err) {
            console.error(err);
            setUpdateMessage(`Error: ${err.message}`);
            setIsUpdating(false); // Stop loading on error
            setTimeout(() => setUpdateMessage(''), 3000); // Clear error message after a while
        }
    };

    const formatDateTime = (dateTimeString) => {
        if (!dateTimeString) return 'N/A';
        const date = new Date(dateTimeString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        }) + ', ' + date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    if (loading) {
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
                {/* Conditionally render history button */}
                {incident.caseCount > 0 ? (
                    <button onClick={handleViewHistory} className={styles.historyButton} title="View Case History">
                        <FaHistory />
                        <span>History</span>
                    </button>
                ) : (
                    // Render a placeholder div to maintain layout balance
                    <div className={styles.historyButtonPlaceholder} />
                )}
            </div>

            <div className={styles.detailGrid}>
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

            {/* Status update message */}
            {updateMessage && <p className={styles.updateMessage}>{updateMessage}</p>}


            {/* Action Buttons */}
            <div className={styles.actionsContainer}>
                {/* --- MODIFIED MEDIA BUTTON CONDITION --- */}
                {incident.mediaFileCount > 0 && (
                    <Link
                        to={`/incident/${incident.id}/media`}
                        // state={{ incident: incident }} // Pass incident data if needed by media page (if NOT fetching there)
                        className={`${styles.actionButton} ${styles.mediaButton}`}
                    >
                        <FaImages />
                        {/* Use mediaFileCount */}
                        <span>View Media ({incident.mediaFileCount})</span>
                    </Link>
                )}
                {/* --- END MODIFICATION --- */}

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

                {/* --- Conditional Actions based on Status (No changes needed here) --- */}
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

                        <button onClick={() => setIsCloseModalOpen(true)} className={`${styles.actionButton} ${styles.closeButton}`}>
                            Close Incident
                        </button>
                    </>
                )}

                {(incident.status === 'ASSIGNED') && (
                    <>
                        <button onClick={handleViewTeam} className={`${styles.actionButton} ${styles.viewTeamButton}`}>
                            <FaUsers />
                            <span>View Team</span>
                        </button>

                        {/* ✨ ADD NEW BUTTON HERE */}
                        <button onClick={() => setIsTeamItemsModalOpen(true)} className={`${styles.actionButton} ${styles.viewKitsButton}`}>
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

                        {/* ✨ ADD NEW BUTTON HERE */}
                        <button onClick={() => setIsTeamItemsModalOpen(true)} className={`${styles.actionButton} ${styles.viewKitsButton}`}>
                            <FaBriefcaseMedical />
                            <span>View Team Kit</span>
                        </button>
                    </>
                )}

                {incident.status === 'ONGOING' && (
                    <>
                        {/* ✨ ADDING BUTTONS TO ONGOING AS REQUESTED */}
                        <button onClick={handleViewTeam} className={`${styles.actionButton} ${styles.viewTeamButton}`}>
                            <FaUsers />
                            <span>View Team</span>
                        </button>

                        <button onClick={() => setIsTeamItemsModalOpen(true)} className={`${styles.actionButton} ${styles.viewKitsButton}`}>
                            <FaBriefcaseMedical />
                            <span>View Team Kit</span>
                        </button>

                        {/* This button was originally under 'ONGOING' in your file */}
                        <button onClick={handleMarkAsResolved} disabled={isUpdating} className={`${styles.actionButton} ${styles.resolveButton}`}>
                            {isUpdating && updateMessage.includes('Resolved') ? <FaSpinner className={styles.spinner} /> : 'Mark as Resolved'}
                        </button>
                    </>
                )}
                {incident.status === 'RESOLVED' && (
                    <>
                        <button onClick={handleReactivate} disabled={isUpdating} className={`${styles.actionButton} ${styles.updateButton}`}>
                            {isUpdating && updateMessage.includes('Reactivating') ? <FaSpinner className={styles.spinner} /> : <FaUndo />}
                            <span>Reactivate</span>
                        </button>
                        <button onClick={() => setIsDeleteModalOpen(true)} disabled={isUpdating} className={`${styles.actionButton} ${styles.deleteButton}`}>
                            <FaTrash />
                            <span>Delete Incident</span>
                        </button>
                    </>
                )}

                {incident.status === 'CLOSED' && (
                    <button onClick={() => setIsDeleteModalOpen(true)} disabled={isUpdating} className={`${styles.actionButton} ${styles.deleteButton}`}>
                        <FaTrash />
                        <span>Delete Incident</span>
                    </button>
                )}
            </div>

            {/* --- Modals --- */}
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
                    onConfirm={handleDelete} // Pass the modified handler
                    onCancel={() => setIsDeleteModalOpen(false)}
                    confirmText="Yes, Delete"
                    cancelText="No, Keep It"
                    isProcessing={isUpdating} // Use isUpdating for loading state
                />
            )}

            {/* ✨ RENDER THE NEW MODAL */}
            <TeamItemsListModal
                isOpen={isTeamItemsModalOpen}
                onClose={() => setIsTeamItemsModalOpen(false)}
                incidentId={incidentId}
                token={token}
            />
        </div>
    );
};

export default IncidentDetailPage;