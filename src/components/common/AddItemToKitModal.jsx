import React, { useState, useEffect } from 'react';
import styles from './AddItemToKitModal.module.css';
import { FaTimes } from 'react-icons/fa';
import CustomSelect from './CustomSelect.jsx';

const AddItemToKitModal = ({ inventoryItems, onClose, onSave }) => {
    const [selectedItem, setSelectedItem] = useState({
        inventoryItemId: '',
        quantity: 1,
        personallyProcured: false,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (inventoryItems.length > 0) {
            setSelectedItem(prev => ({ ...prev, inventoryItemId: inventoryItems[0].id }));
        }
    }, [inventoryItems]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setSelectedItem(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        const success = await onSave(selectedItem);
        if (success) {
            onClose();
        } else {
            // Error handling can be added here if needed
            setIsSubmitting(false);
        }
    };

    const itemOptions = inventoryItems.map(item => ({
        value: item.id,
        label: `${item.name} (In Stock: ${item.quantity})`
    }));

    const selectedOptionLabel = itemOptions.find(opt => opt.value == selectedItem.inventoryItemId)?.label || '';

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}><FaTimes /></button>
                <h2>Add Item to Kit</h2>
                <form onSubmit={handleSubmit}>
                    <div className={styles.formGroup}>
                        <label htmlFor="inventoryItemId">Item</label>
                        <CustomSelect
                            name="inventoryItemId"
                            options={itemOptions}
                            value={selectedOptionLabel}
                            onChange={(e) => handleChange({ target: { name: 'inventoryItemId', value: e.target.value } })}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label htmlFor="quantity">Quantity</label>
                        <input
                            type="number"
                            id="quantity"
                            name="quantity"
                            value={selectedItem.quantity}
                            onChange={handleChange}
                            min="1"
                            required
                        />
                    </div>
                    <div className={styles.checkboxGroup}>
                        <input
                            type="checkbox"
                            id="personallyProcured"
                            name="personallyProcured"
                            checked={selectedItem.personallyProcured}
                            onChange={handleChange}
                        />
                        <label htmlFor="personallyProcured">I bought this item personally</label>
                    </div>
                    <button type="submit" className={styles.saveButton} disabled={isSubmitting}>
                        {isSubmitting ? 'Adding...' : 'Add to Kit'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default AddItemToKitModal;