import { useState } from 'react';

const SocketLoginPage = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoginError('');

        try {
            const response = await fetch('http://localhost:8080/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                setLoginError(errorText || 'Login failed');
                return;
            }

            const data = await response.json();
            localStorage.setItem('jwtToken', data.token);
            onLoginSuccess(data.token); // Call the prop function to update the token in the parent
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
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
            />
            <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />
            <button type="submit">Log In</button>
        </form>
    );
};

export default SocketLoginPage;