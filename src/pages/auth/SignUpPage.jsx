import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaSpinner } from 'react-icons/fa';
import SignUpModal from '../../components/common/SignUpModal.jsx';
import CustomSelect from '../../components/common/CustomSelect.jsx';
import styles from './SignUpPage.module.css';
import appStyles from '../../App.module.css';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const SignUpPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        phoneNumber: '',
        username: '',
        password: '',
        address: '',
        motivation: '',
        hasVehicle: 'No',
        vehicleType: 'Bike',
        canProvideShelter: 'No',
        hasMedicineBox: 'No',
        experienceLevel: 'Beginner',
        latitude: null,
        longitude: null,
    });
    const [formErrors, setFormErrors] = useState({});
    const [modalContent, setModalContent] = useState({ isOpen: false, message: '', isError: false });
    const [apiError, setApiError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validatePhoneNumber = (number) => {
        if (!/^\d{10}$/.test(number)) {
            setFormErrors(prev => ({ ...prev, phoneNumber: 'Phone number must be 10 digits.' }));
        } else {
            setFormErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors.phoneNumber;
                return newErrors;
            });
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
        if (name === 'phoneNumber') {
            validatePhoneNumber(value);
        }
    };

    useEffect(() => {
        if (formData.firstName && !formData.username) {
            setFormData(prevState => ({ ...prevState, username: prevState.firstName.toLowerCase().trim() }));
        }
    }, [formData.firstName]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setApiError('');
        if (Object.keys(formErrors).length > 0) {
            setApiError('Please fix the errors before submitting.');
            return;
        }

        setIsSubmitting(true);
        const payload = {
            ...formData,
            hasVehicle: formData.hasVehicle === 'Yes',
            canProvideShelter: formData.canProvideShelter === 'Yes',
            hasMedicineBox: formData.hasMedicineBox === 'Yes',
            vehicleType: formData.hasVehicle === 'Yes' ? formData.vehicleType : '',
        };

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setModalContent({
                    isOpen: true,
                    message: 'Thank you for signing up! Your account is pending approval from an administrator.',
                    isError: false
                });
            } else {
                const errorData = await response.json();
                setApiError(errorData.message || 'An unknown error occurred. Please try again.');
            }
        } catch (error) {
            setApiError('Could not connect to the server. Please check your connection and try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeModal = () => {
        setModalContent({ isOpen: false, message: '', isError: false });
        if (!modalContent.isError) {
            navigate('/login');
        }
    };

    const yesNoOptions = [{ value: 'No', label: 'No' }, { value: 'Yes', label: 'Yes' }];
    const experienceOptions = [
        { value: 'Beginner', label: 'Beginner' },
        { value: 'Intermediate', label: 'Intermediate' },
        { value: 'Advanced', label: 'Advanced' },
        { value: 'Expert', label: 'Expert' }
    ];
    const vehicleTypeOptions = [
        { value: 'Bike', label: 'Bike' },
        { value: 'Scooty', label: 'Scooty' },
        { value: 'Car', label: 'Car' },
        { value: 'Other', label: 'Other' },
    ];

    return (
        <>
            <div className={styles.formContainer}>
                <Link to="/login" className={styles.backLink}>
                    <FaArrowLeft />
                    <span>Back to Login</span>
                </Link>

                <div className={styles.formHeader}>
                    <h1>Join Our Team</h1>
                    <p>Become a Pawsome volunteer and make a difference.</p>
                </div>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGrid}>
                        <div className={styles.formGroup}>
                            <label htmlFor="firstName" className={styles.formLabel}>First Name</label>
                            <input type="text" id="firstName" name="firstName" className={styles.formInput} value={formData.firstName} onChange={handleChange} required />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="lastName" className={styles.formLabel}>Last Name</label>
                            <input type="text" id="lastName" name="lastName" className={styles.formInput} value={formData.lastName} onChange={handleChange} required />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="phoneNumber" className={styles.formLabel}>Phone Number</label>
                            <input type="tel" id="phoneNumber" name="phoneNumber" className={styles.formInput} value={formData.phoneNumber} onChange={handleChange} required />
                            {formErrors.phoneNumber && <p className={styles.errorText}>{formErrors.phoneNumber}</p>}
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="username" className={styles.formLabel}>Username</label>
                            <input type="text" id="username" name="username" className={styles.formInput} value={formData.username} onChange={handleChange} required />
                        </div>
                        <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
                            <label htmlFor="password" className={styles.formLabel}>Create a Password</label>
                            <input type="password" id="password" name="password" className={styles.formInput} value={formData.password} onChange={handleChange} required />
                        </div>
                        <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
                            <label htmlFor="address" className={styles.formLabel}>Address</label>
                            <input type="text" id="address" name="address" className={styles.formInput} value={formData.address} onChange={handleChange} />
                        </div>
                        <div className={`${styles.formGroup} ${styles.formGroupFullWidth}`}>
                            <label htmlFor="motivation" className={styles.formLabel}>Why do you want to join us?</label>
                            <textarea id="motivation" name="motivation" className={styles.formTextarea} value={formData.motivation} onChange={handleChange}></textarea>
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="experienceLevel" className={styles.formLabel}>Experience Level</label>
                            <CustomSelect name="experienceLevel" options={experienceOptions} value={formData.experienceLevel} onChange={handleChange} />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="hasVehicle" className={styles.formLabel}>Do you have a vehicle?</label>
                            <CustomSelect name="hasVehicle" options={yesNoOptions} value={formData.hasVehicle} onChange={handleChange} />
                        </div>
                        {formData.hasVehicle === 'Yes' && (
                            <div className={styles.formGroup}>
                                <label htmlFor="vehicleType" className={styles.formLabel}>Vehicle Type</label>
                                <CustomSelect name="vehicleType" options={vehicleTypeOptions} value={formData.vehicleType} onChange={handleChange} />
                            </div>
                        )}
                        <div className={styles.formGroup}>
                            <label htmlFor="canProvideShelter" className={styles.formLabel}>Can you provide shelter?</label>
                            <CustomSelect name="canProvideShelter" options={yesNoOptions} value={formData.canProvideShelter} onChange={handleChange} />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="hasMedicineBox" className={styles.formLabel}>Do you have a First-Aid Kit?</label>
                            <CustomSelect name="hasMedicineBox" options={yesNoOptions} value={formData.hasMedicineBox} onChange={handleChange} />
                        </div>
                    </div>
                    {apiError && <p className={styles.apiError}>{apiError}</p>}
                    <button type="submit" className={`${appStyles.btn} ${appStyles.btnPrimary} ${appStyles.btnFullWidth}`} disabled={isSubmitting || Object.keys(formErrors).length > 0}>
                        {isSubmitting ? <FaSpinner className={appStyles.spinner} /> : 'Sign Up'}
                    </button>
                </form>
            </div>

            <SignUpModal isOpen={modalContent.isOpen} onClose={closeModal}>
                <div className={appStyles.successModal}>
                    <div className={appStyles.successModalIcon}>{modalContent.isError ? '❌' : '✔'}</div>
                    <h2 className={appStyles.successModalTitle}>{modalContent.isError ? 'Error' : 'Thank You!'}</h2>
                    <p className={appStyles.successModalMessage}>
                        {modalContent.message}
                    </p>
                    <button onClick={closeModal} className={`${appStyles.btn} ${appStyles.btnPrimary}`}>
                        Got it!
                    </button>
                </div>
            </SignUpModal>
        </>
    );
};

export default SignUpPage;