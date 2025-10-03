import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import styles from './FirstAidKitPage.module.css';
import { FaPlus, FaShoppingCart, FaCheck, FaTrash, FaSpinner, FaUserCircle, FaBoxes } from 'react-icons/fa';
import CustomSelect from '../../components/common/CustomSelect.jsx';
import ConfirmationModal from '../../components/common/ConfirmationModal.jsx';
import { jwtDecode } from 'jwt-decode';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const FirstAidKitPage = ({ token }) => {
    const { userId } = useParams();
    const [kit, setKit] = useState(null);
    const [inventory, setInventory] = useState([]);
    const [requisitions, setRequisitions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [itemToConfirm, setItemToConfirm] = useState(null); // For confirming removal of last item

    // States for Request Cart
    const [requestCart, setRequestCart] = useState([]);
    const [reqSelectedItem, setReqSelectedItem] = useState('');
    const [reqSelectedQuantity, setReqSelectedQuantity] = useState(1);

    // States for Personal Item
    const [personalSelectedItem, setPersonalSelectedItem] = useState('');
    const [personalSelectedQuantity, setPersonalSelectedQuantity] = useState(1);

    const fetchData = useCallback(async () => {
        if (!token) return;
        setLoading(true);
        try {
            const [kitRes, invRes, reqRes] = await Promise.all([
                fetch(`${API_BASE_URL}/api/first-aid-kit/${userId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/api/inventory/items`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/api/requisitions/my-requests`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!kitRes.ok || !invRes.ok || !reqRes.ok) {
                throw new Error('Failed to fetch all necessary data.');
            }

            setKit(await kitRes.json());
            const invData = await invRes.json();
            setInventory(invData);
            if (invData.length > 0) {
                setReqSelectedItem(invData[0].id);
                setPersonalSelectedItem(invData[0].id);
            }

            setRequisitions(await reqRes.json());

        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [userId, token]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddToCart = () => {
        if (!reqSelectedItem || reqSelectedQuantity < 1) return;
        const item = inventory.find(i => i.id === Number(reqSelectedItem));
        if (item && !requestCart.some(cartItem => cartItem.id === item.id)) {
            setRequestCart(prev => [...prev, { ...item, quantity: reqSelectedQuantity, inventoryItemId: item.id }]);
        }
        setReqSelectedQuantity(1);
    };

    const handleSavePersonalItem = async () => {
        if (!personalSelectedItem || personalSelectedQuantity < 1) return;
        const item = inventory.find(i => i.id === Number(personalSelectedItem));
        if (item) {
            try {
                const response = await fetch(`${API_BASE_URL}/api/first-aid-kit/${userId}/items`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ inventoryItemId: item.id, quantity: personalSelectedQuantity, personallyProcured: true })
                });
                if (!response.ok) throw new Error('Failed to add personal item.');
                setPersonalSelectedQuantity(1);
                await fetchData();
            } catch (err) {
                setError(err.message);
            }
        }
    };

    const handleSubmitRequisition = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/requisitions`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(requestCart.map(({ id, quantity }) => ({ inventoryItemId: id, quantity })))
            });
            if (!response.ok) throw new Error('Failed to submit requisition.');
            setRequestCart([]);
            await fetchData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleAcknowledge = async (requisitionId) => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/requisitions/${requisitionId}/acknowledge`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to acknowledge receipt.');
            await fetchData();
        } catch (err) {
            setError(err.message);
        }
    };

    const handleDecrementItem = async (item) => {
        if (item.quantity === 1) {
            setItemToConfirm(item);
            return;
        }

        const newQuantity = item.quantity - 1;
        try {
            const response = await fetch(`${API_BASE_URL}/api/first-aid-kit/${userId}/items/${item.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: newQuantity })
            });
            if (!response.ok) throw new Error('Failed to update item quantity.');
            await fetchData();
        } catch (err) {
            setError(err.message);
        }
    };

    const confirmRemoveLastItem = async () => {
        if (!itemToConfirm) return;
        try {
            const response = await fetch(`${API_BASE_URL}/api/first-aid-kit/${userId}/items/${itemToConfirm.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error('Failed to remove item from kit.');
            setItemToConfirm(null);
            await fetchData();
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return <div className={styles.container}><div className={styles.centered}><FaSpinner className={styles.spinner} /></div></div>;
    if (error) return <div className={styles.container}><p className={styles.error}>{error}</p></div>;

    const inventoryOptions = inventory.map(item => ({
        value: item.id,
        label: `${item.name} (In Stock: ${item.quantity})`
    }));

    return (
        <>
            <div className={styles.container}>
                <header className={styles.header}>
                    <h1>My First-Aid Kit</h1>
                </header>

                <div className={styles.section}>
                    <h2>My Open Requests</h2>
                    {requisitions.length > 0 ? requisitions.map(req => (
                        <div key={req.id} className={`${styles.requisitionCard} ${styles[req.status.toLowerCase()]}`}>
                            <div className={styles.requisitionInfo}>
                                <span className={styles.statusTag}>{req.status.replace('_', ' ')}</span>
                                <ul className={styles.requisitionItemList}>
                                    {req.items.map(item => <li key={item.id}>{item.quantity} x {item.inventoryItemName}</li>)}
                                </ul>
                            </div>
                            {req.status === 'DISPATCHED' && (
                                <button className={styles.actionButton} onClick={() => handleAcknowledge(req.id)}>
                                    <FaCheck /> Acknowledge Receipt
                                </button>
                            )}
                        </div>
                    )) : <p className={styles.emptyMessage}>You have no open requests.</p>}
                </div>

                <div className={styles.section}>
                    <h2>My Kit Items</h2>
                    {kit?.items && kit.items.length > 0 ? (
                        <div className={styles.kitGrid}>
                            {kit.items.map(item => (
                                <div key={item.id} className={styles.kitItemCard}>
                                    <div className={styles.cardContent}>
                                        <h3>{item.inventoryItemName}</h3>
                                        <div className={styles.quantity}>
                                            {item.quantity} <span>{inventory.find(i => i.id === item.inventoryItemId)?.unit || 'pieces'}</span>
                                        </div>
                                    </div>
                                    <div className={styles.cardFooter}>
                                        {item.personallyProcured ?
                                            <span className={styles.personalTag}><FaUserCircle/> Personal</span> : <div></div>}
                                        <button onClick={() => handleDecrementItem(item)} className={styles.deleteButton} title="Use one item">
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : <p className={styles.emptyMessage}>Your kit is currently empty.</p>}
                </div>

                <div className={styles.section}>
                    <h2><FaUserCircle /> Add a Personal Item</h2>
                    <p className={styles.sectionDescription}>Add an item you purchased yourself to your kit.</p>
                    <div className={styles.addItemForm}>
                        <div className={styles.formRow}>
                            <CustomSelect options={inventoryOptions} value={personalSelectedItem} onChange={e => setPersonalSelectedItem(e.target.value)} />
                            <input type="number" value={personalSelectedQuantity} onChange={e => setPersonalSelectedQuantity(Number(e.target.value))} min="1" className={styles.quantityInput} />
                        </div>
                        <button onClick={handleSavePersonalItem} className={styles.personalAddButton}>
                            <FaPlus /> Add Personal Item
                        </button>
                    </div>
                </div>

                <div className={styles.section}>
                    <h2><FaBoxes /> Request from Inventory</h2>
                    <p className={styles.sectionDescription}>Request items from the central NGO inventory.</p>
                    <div className={styles.addItemForm}>
                        <div className={styles.formRow}>
                            <CustomSelect options={inventoryOptions} value={reqSelectedItem} onChange={e => setReqSelectedItem(e.target.value)} />
                            <input type="number" value={reqSelectedQuantity} onChange={e => setReqSelectedQuantity(Number(e.target.value))} min="1" className={styles.quantityInput} />
                        </div>
                        <button onClick={handleAddToCart} className={styles.addButton}>
                            <FaPlus /> Add to Request Cart
                        </button>
                    </div>

                    {requestCart.length > 0 && (
                        <div className={styles.cart}>
                            <h3><FaShoppingCart /> Requisition Cart</h3>
                            <ul>
                                {requestCart.map((item, index) => (
                                    <li key={index}>
                                        <span>{item.quantity} x {item.name}</span>
                                        <button onClick={() => setRequestCart(prev => prev.filter((_, i) => i !== index))} className={styles.deleteButton}><FaTrash /></button>
                                    </li>
                                ))}
                            </ul>
                            <button className={styles.submitButton} onClick={handleSubmitRequisition}>Submit Requisition</button>
                        </div>
                    )}
                </div>
            </div>

            {itemToConfirm && (
                <ConfirmationModal
                    message={`This is the last "${itemToConfirm.inventoryItemName}" in your kit. Are you sure you want to remove it?`}
                    onConfirm={confirmRemoveLastItem}
                    onCancel={() => setItemToConfirm(null)}
                    confirmText="Yes, Remove"
                    confirmClass="delete"
                />
            )}
        </>
    );
};

export default FirstAidKitPage;