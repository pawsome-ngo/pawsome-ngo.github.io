import React, { useState, useEffect } from 'react';
import styles from './AddItemModal.module.css';
import { FaTimes } from 'react-icons/fa';
import CustomSelect from './CustomSelect.jsx';

const AddItemModal = ({ itemToEdit, categories, onClose, onSave }) => {
    const [item, setItem] = useState({
        name: '',
        categoryId: '',
        quantity: 0,
        lowStockThreshold: 5,
        unit: 'pieces'
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (itemToEdit) {
            setItem(itemToEdit);
        } else if (categories.length > 0) {
            setItem(prev => ({ ...prev, categoryId: categories[0].id }));
        }
    }, [itemToEdit, categories]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setItem(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const success = await onSave({ ...item, categoryId: Number(item.categoryId) });
        if (success) {
            onClose();
        } else {
            setIsSubmitting(false);
        }
    };

    const categoryOptions = categories.map(cat => ({
        value: cat.id,
        label: cat.name
    }));

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}><FaTimes /></button>
                <h2>{itemToEdit ? 'Edit Item' : 'Add New Item'}</h2>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="name">Item Name</label>
                        <input type="text" id="name" name="name" value={item.name} onChange={handleChange} required />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="categoryId">Category</label>
                        <CustomSelect
                            name="categoryId"
                            options={categoryOptions}
                            value={item.categoryId}
                            onChange={(e) => handleChange({ target: { name: 'categoryId', value: e.target.value } })}
                        />
                    </div>
                    <div className={styles.formRow}>
                        <div className={styles.formGroup}>
                            <label htmlFor="quantity">Quantity</label>
                            <input type="number" id="quantity" name="quantity" value={item.quantity} onChange={handleChange} required min="0" />
                        </div>
                        <div className={styles.formGroup}>
                            <label htmlFor="unit">Unit</label>
                            <input type="text" id="unit" name="unit" value={item.unit} onChange={handleChange} required />
                        </div>
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="lowStockThreshold">Low Stock Threshold</label>
                        <input type="number" id="lowStockThreshold" name="lowStockThreshold" value={item.lowStockThreshold} onChange={handleChange} required min="0" />
                    </div>
                    <button type="submit" className={styles.saveButton} disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : (itemToEdit ? 'Update Item' : 'Save Item')}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddItemModal;