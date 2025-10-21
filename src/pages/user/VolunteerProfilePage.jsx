// File: pawsome-ngo/full/full-d91a39b5e3886f03789eb932561a5689b5f95888/pawsome-frontend-code-react/src/pages/user/VolunteerProfilePage.jsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './VolunteerProfilePage.module.css';
import { FaSpinner, FaShieldAlt, FaUser, FaClock, FaPhone, FaArrowLeft, FaFirstAid, FaUserCircle, FaExclamationTriangle, FaCheckCircle, FaCar, FaHome, FaGraduationCap } from 'react-icons/fa';
import CustomSelect from '../../components/common/CustomSelect.jsx';
import Avatar from '../../components/common/Avatar.jsx';
import Lightbox from '../../components/common/Lightbox.jsx';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

// --- ✨ Define Experience Level options ---
const experienceOptions = [
    { value: 'Beginner', label: 'Beginner' },
    { value: 'Intermediate', label: 'Intermediate' },
    { value: 'Advanced', label: 'Advanced' },
    { value: 'Expert', label: 'Expert' }
];
// --- End ---

const positionOptions = [
    { value: 'FOUNDER', label: 'Founder' },
    { value: 'CO_FOUNDER', label: 'Co-Founder' },
    { value: 'PRESIDENT', label: 'President' },
    { value: 'VICE_PRESIDENT', label: 'Vice-President' },
    { value: 'GENERAL_SECRETARY', label: 'General Secretary' },
    { value: 'ASSISTANT_GENERAL_SECRETARY', label: 'Assistant General Secretary' },
    { value: 'EXECUTIVE', label: 'Executive' },
    { value: 'ASSOCIATE', label: 'Associate' },
    { value: 'MEMBER', label: 'Member' },
    { value: 'FEEDING_CAPTAIN', label: 'Feeding Captain' },
    { value: 'ADOPTION_COORDINATOR', label: 'Adoption Coordinator' },
];

const allRoles = ['MEMBER', 'RESCUE_CAPTAIN', 'INVENTORY_MANAGER', 'ADMIN', 'SUPER_ADMIN'];

const VolunteerProfilePage = ({ token, currentUser }) => {
    const { volunteerId } = useParams();
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);

    const [feedback, setFeedback] = useState('');
    const [feedbackType, setFeedbackType] = useState(''); // 'success' or 'error'
    const [firstAidKit, setFirstAidKit] = useState(null);
    const [selectedPosition, setSelectedPosition] = useState('');
    const [selectedRoles, setSelectedRoles] = useState([]);
    // --- ✨ Add state for Experience Level ---
    const [selectedExperience, setSelectedExperience] = useState('');
    // --- End Add ---

    const [lightboxSrc, setLightboxSrc] = useState(null);
    const [isSaving, setIsSaving] = useState(false); // State for save spinner

    const isSuperAdmin = useMemo(() => currentUser?.roles.includes('ROLE_SUPER_ADMIN'), [currentUser]);
    const isAdmin = useMemo(() => currentUser?.roles.includes('ROLE_ADMIN'), [currentUser]);

    const fetchUserDetails = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/api/volunteers/${volunteerId}`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (!response.ok) throw new Error("Failed to fetch user details.");

            const detailedUser = await response.json();

            let memberSince = "N/A";
            if (detailedUser.joinedSince) {
                const joined = new Date(detailedUser.joinedSince);
                const now = new Date();
                let years = now.getFullYear() - joined.getFullYear();
                let months = now.getMonth() - joined.getMonth();
                let days = now.getDate() - joined.getDate();
                if (days < 0) { months--; days += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
                if (months < 0) { years--; months += 12; }
                memberSince = `${years}y ${months}m ${days}d`;
            }

            setDetails({ ...detailedUser, memberSince });
            setSelectedPosition(detailedUser.position || 'MEMBER');
            setSelectedRoles(detailedUser.roles || ['MEMBER']);
            // --- ✨ Initialize experience state ---
            setSelectedExperience(detailedUser.experienceLevel || 'Beginner');

            if (detailedUser.hasMedicineBox) {
                const kitResponse = await fetch(`${API_BASE_URL}/api/first-aid-kit/${volunteerId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (kitResponse.ok) {
                    const kitData = await kitResponse.json();
                    setFirstAidKit(kitData);
                }
            } else {
                setFirstAidKit(null);
            }

        } catch (err) {
            console.error("Failed to fetch user details:", err);
            setFeedback("Failed to load user details.");
            setFeedbackType('error');
        } finally {
            setLoading(false);
        }
    }, [volunteerId, token]);

    useEffect(() => {
        if (volunteerId) {
            fetchUserDetails();
        }
    }, [volunteerId, fetchUserDetails]);

    const handleSaveChanges = async () => {
        setIsSaving(true); // --- ✨ Show spinner
        setFeedback('Saving changes...');
        setFeedbackType('');

        try {
            const requests = []; // Array to hold all API request promises

            // --- ✨ 1. Add Experience Level update request (Super Admin only) ---
            if (isSuperAdmin) {
                requests.push(
                    fetch(`${API_BASE_URL}/api/admin/users/${volunteerId}/experience`, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ experience: selectedExperience }),
                    })
                );
            }
            // --- End Add ---

            // 2. Add Position update request (Super Admin only)
            if (isSuperAdmin) {
                requests.push(
                    fetch(`${API_BASE_URL}/api/admin/users/${volunteerId}/position`, {
                        method: 'PUT',
                        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ position: selectedPosition }),
                    })
                );
            }

            // 3. Add Roles update request (Admin or Super Admin)
            requests.push(
                fetch(`${API_BASE_URL}/api/admin/users/${volunteerId}/roles`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify(selectedRoles),
                })
            );

            // Execute all requests in parallel
            const responses = await Promise.all(requests);

            // Check all responses for errors
            for (const response of responses) {
                if (!response.ok) {
                    const responseData = await response.json().catch(() => ({}));
                    throw new Error(responseData.message || 'One or more updates failed.');
                }
            }

            setFeedback('Changes saved successfully!');
            setFeedbackType('success');

            await fetchUserDetails(); // Refresh data
            setTimeout(() => setFeedback(''), 1500); // Clear feedback

        } catch (err) {
            console.error("Error saving changes:", err);
            setFeedback(`Error: ${err.message}`);
            setFeedbackType('error');
        } finally {
            setIsSaving(false); // --- ✨ Hide spinner
        }
    };

    const handleRoleChange = (role) => {
        setSelectedRoles(prev =>
            prev.includes(role)
                ? prev.filter(r => r !== role)
                : [...prev, role]
        );
    };

    const handleAvatarClick = (user) => {
        // ... (function remains the same)
        if (!user) return;
        for (const path in avatarModules) {
            if (path.includes(`/avatars/${user.id}.`)) {
                avatarModules[path]().then(mod => {
                    setLightboxSrc(mod.default);
                });
                break;
            }
        }
    };

    if (loading || !details) {
        return (
            <div className={styles.pageContainer}>
                <div className={styles.centered}><FaSpinner className={styles.spinner}/></div>
            </div>
        );
    }
    const fullName = details?.firstName && details?.lastName ? `${details.firstName} ${details.lastName}` : 'Volunteer';

    const isTargetSuperAdmin = details.roles.includes('SUPER_ADMIN');
    const isTargetAdmin = details.roles.includes('ADMIN');

    const canViewAdminControls = isSuperAdmin || isAdmin;


    return (
        <>
            <div className={styles.pageContainer}>
                <Link to="/volunteers" className={styles.backLink}>
                    <FaArrowLeft />
                    <span>Back to Volunteers</span>
                </Link>
                <div className={styles.profileHeader}>
                    <div className={styles.avatar} onClick={() => handleAvatarClick(details)}>
                        <Avatar userId={details.id} name={fullName} />
                    </div>
                    <h2>{fullName}</h2>
                    <p className={styles.currentPosition}>{(details.position || 'MEMBER').replace(/_/g, ' ')}</p>
                </div>

                <div className={styles.profileBody}>
                    <div className={styles.detailGrid}>
                        <div className={styles.detailItem}>
                            <FaClock className={styles.detailIcon}/>
                            <strong>Member Since</strong>
                            <p>{details.memberSince}</p>
                        </div>
                        <div className={styles.detailItem}>
                            <FaPhone className={styles.detailIcon}/>
                            <strong>Phone Number</strong>
                            <p>{details.phoneNumber || 'N/A'}</p>
                        </div>
                        <div className={styles.detailItem}>
                            {/* --- ✨ Use GraduationCap icon --- */}
                            <FaGraduationCap className={styles.detailIcon}/>
                            <strong>Experience</strong>
                            <p>{(details.experienceLevel || 'N/A').replace('_', ' ')}</p>
                        </div>
                        <div className={styles.detailItem}>
                            <FaCar className={styles.detailIcon}/>
                            <strong>Vehicle</strong>
                            <p>{details.hasVehicle ? (details.vehicleType || 'Yes') : 'No'}</p>
                        </div>
                        <div className={styles.detailItem}>
                            <FaHome className={styles.detailIcon}/>
                            <strong>Shelter</strong>
                            <p>{details.canProvideShelter ? 'Yes' : 'No'}</p>
                        </div>
                        <div className={styles.detailItem}>
                            <FaFirstAid className={styles.detailIcon}/>
                            <strong>First-Aid Kit</strong>
                            <p>{details.hasMedicineBox ? 'Yes' : 'No'}</p>
                        </div>

                        <div className={`${styles.detailItem} ${styles.rolesItem}`}>
                            <FaShieldAlt className={styles.detailIcon}/>
                            <strong>Current Roles</strong>
                            <div className={styles.rolesContainer}>
                                {(details.roles && details.roles.length > 0) ? (
                                    details.roles.map(role => (
                                        <span key={role} className={styles.roleTag}>
                                        {role.replace(/_/g, ' ')}
                                    </span>
                                    ))
                                ) : (
                                    <span>N/A</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {details.hasMedicineBox && (
                    <div className={styles.firstAidKitSection}>
                        <h4><FaFirstAid /> First-Aid Kit</h4>
                        {firstAidKit && firstAidKit.items.length > 0 ? (
                            <div className={styles.kitGrid}>
                                {firstAidKit.items.map(item => (
                                    <div key={item.id} className={styles.kitItemCard}>
                                        <div className={styles.cardContent}>
                                            <h3>{item.inventoryItemName}</h3>
                                            <div className={styles.quantity}>
                                                {item.quantity}
                                            </div>
                                        </div>
                                        {item.personallyProcured && (
                                            <div className={styles.cardFooter}>
                                                <span className={styles.personalTag}><FaUserCircle/> Personal</span>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className={styles.emptyMessage}>No first-aid kit items found for this volunteer.</p>
                        )}
                    </div>
                )}

                {canViewAdminControls && (
                    <div className={styles.adminSection}>
                        <h4 className={styles.adminTitle}><FaShieldAlt /> Admin Controls</h4>

                        {isSuperAdmin && (
                            <>
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Update Position</label>
                                    <CustomSelect
                                        name="position"
                                        options={positionOptions}
                                        value={selectedPosition}
                                        onChange={(e) => setSelectedPosition(e.target.value)}
                                    />
                                </div>
                                {/* --- ✨ Add Experience Level Dropdown --- */}
                                <div className={styles.formGroup}>
                                    <label className={styles.formLabel}>Update Experience Level</label>
                                    <CustomSelect
                                        name="experience"
                                        options={experienceOptions}
                                        value={selectedExperience}
                                        onChange={(e) => setSelectedExperience(e.target.value)}
                                    />
                                </div>
                                {/* --- End Add --- */}
                            </>
                        )}

                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Update Roles</label>
                            <div className={styles.checkboxRolesContainer}>
                                {allRoles.map(role => {
                                    const isDisabled =
                                        role === 'SUPER_ADMIN' ||
                                        (!isSuperAdmin && (role === 'ADMIN' || isTargetSuperAdmin || role === 'INVENTORY_MANAGER'));

                                    return (
                                        <label key={role} className={`${styles.checkboxLabel} ${isDisabled ? styles.disabled : ''}`}>
                                            <input
                                                type="checkbox"
                                                value={role}
                                                checked={selectedRoles.includes(role)}
                                                onChange={() => handleRoleChange(role)}
                                                disabled={isDisabled}
                                            />
                                            <span>{role.replace(/_/g, ' ')}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        </div>

                        {feedback && (
                            <p className={`${styles.feedbackMessage} ${styles[feedbackType]}`}>
                                {feedbackType === 'error' ? <FaExclamationTriangle /> : <FaCheckCircle />}
                                {feedback}
                            </p>
                        )}
                        <button onClick={handleSaveChanges} className={styles.saveButton} disabled={isSaving}>
                            {isSaving ? <FaSpinner className={styles.spinner} /> : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>

            <Lightbox
                src={lightboxSrc}
                alt={`${fullName}'s Avatar`}
                onClose={() => setLightboxSrc(null)}
            />
        </>
    );
};

export default VolunteerProfilePage;