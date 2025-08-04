import React, { useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const SocketLoginPage = ({ onLoginSuccess }) => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
    });
    const [loginError, setLoginError] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prevState => ({ ...prevState, [name]: value }));
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                setLoginError(errorData.message || 'Login failed. Please check your credentials.');
                return;
            }

            const data = await response.json();
            localStorage.setItem('jwtToken', data.token);
            onLoginSuccess(data.token);
        } catch (error) {
            setLoginError('Could not connect to server.');
            console.error('Login error:', error);
        }
    };

    return (
        <form onSubmit={handleLogin}>
            <h1>Login</h1>
            {loginError && <p style={{ color: 'red' }}>{loginError}</p>}
            <input
                type="text"
                placeholder="Username"
                value={formData.username}
                onChange={handleChange}
                required
            />
            <input
                type="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
            />
            <button type="submit">Log In</button>
        </form>
    );
};

export default SocketLoginPage;