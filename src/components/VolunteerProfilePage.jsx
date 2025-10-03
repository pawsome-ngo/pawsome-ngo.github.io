import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import styles from './VolunteerProfilePage.module.css';
import { FaTimes, FaSpinner, FaShieldAlt, FaUser, FaClock, FaPhone, FaArrowLeft, FaFirstAid, FaUserCircle } from 'react-icons/fa';
import CustomSelect from './CustomSelect';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

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
    const [selectedPosition, setSelectedPosition] = useState('');
    const [selectedRoles, setSelectedRoles] = useState([]);
    const [feedback, setFeedback] = useState('');
    const [feedbackType, setFeedbackType] = useState('');
    const [firstAidKit, setFirstAidKit] = useState(null);

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

            if (detailedUser.hasMedicineBox) {
                const kitResponse = await fetch(`${API_BASE_URL}/api/first-aid-kit/${volunteerId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (kitResponse.ok) {
                    const kitData = await kitResponse.json();
                    setFirstAidKit(kitData);
                }
            } else {
                setFirstAidKit(null); // Ensure kit is cleared if user has no medicine box
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
        setFeedback('Saving changes...');
        setFeedbackType('');
        try {
            const getResponseData = async (response) => {
                const contentType = response.headers.get('content-type');
                if (contentType && contentType.indexOf('application/json') !== -1) {
                    return await response.json();
                }
                return { message: 'Changes saved successfully.' };
            };

            if (isSuperAdmin) {
                const positionResponse = await fetch(`${API_BASE_URL}/api/admin/users/${volunteerId}/position`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ position: selectedPosition }),
                });

                const responseData = await getResponseData(positionResponse);
                if (!positionResponse.ok) {
                    throw new Error(responseData.message || 'Failed to save position.');
                }
            }

            const rolesResponse = await fetch(`${API_BASE_URL}/api/admin/users/${volunteerId}/roles`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(selectedRoles),
            });

            const responseData = await getResponseData(rolesResponse);
            if (!rolesResponse.ok) {
                throw new Error(responseData.message || 'Failed to save roles.');
            }

            setFeedback(responseData.message);
            setFeedbackType('success');

            await fetchUserDetails();
            setTimeout(() => setFeedback(''), 1500);

        } catch (err) {
            console.error("Error saving changes:", err);
            setFeedback(`Error: ${err.message}`);
            setFeedbackType('error');
        }
    };

    const handleRoleChange = (role) => {
        setSelectedRoles(prev =>
            prev.includes(role)
                ? prev.filter(r => r !== role)
                : [...prev, role]
        );
    };

    if (loading || !details) {
        return (
            <div className={styles.pageContainer}>
                <div className={styles.centered}><FaSpinner className={styles.spinner}/></div>
            </div>
        );
    }
    const isTargetSuperAdmin = details.roles.includes('SUPER_ADMIN');
    const isTargetAdmin = details.roles.includes('ADMIN');

    const canViewAdminControls = isSuperAdmin || (isAdmin && !isTargetAdmin && !isTargetSuperAdmin);

    const fullName = details?.firstName && details?.lastName ? `${details.firstName} ${details.lastName}` : 'Volunteer';
    const avatarLetter = fullName.charAt(0);

    return (
        <div className={styles.pageContainer}>
            <Link to="/volunteers" className={styles.backLink}>
                <FaArrowLeft />
                <span>Back to Volunteers</span>
            </Link>
            <div className={styles.profileHeader}>
                <div className={styles.avatar}>{avatarLetter}</div>
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
                        <FaUser className={styles.detailIcon}/>
                        <strong>Experience</strong>
                        <p>{(details.experienceLevel || 'N/A').replace('_', ' ')}</p>
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
                        <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Update Position</label>
                            <CustomSelect
                                name="position"
                                options={positionOptions}
                                value={selectedPosition}
                                onChange={(e) => setSelectedPosition(e.target.value)}
                            />
                        </div>
                    )}

                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Update Roles</label>
                        <div className={styles.checkboxRolesContainer}>
                            {allRoles.map(role => {
                                const isDisabled =
                                    role === 'SUPER_ADMIN' ||
                                    (!isSuperAdmin && (role === 'ADMIN' || role === 'INVENTORY_MANAGER'));

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
                            {feedback}
                        </p>
                    )}
                    <button onClick={handleSaveChanges} className={styles.saveButton}>
                        Save Changes
                    </button>
                </div>
            )}
        </div>
    );
};

export default VolunteerProfilePage;