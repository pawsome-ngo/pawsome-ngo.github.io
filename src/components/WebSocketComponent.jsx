import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

const WebSocketComponent = ({ onMessageReceived, token }) => {
    const stompClientRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!token) {
            if (stompClientRef.current) {
                stompClientRef.current.disconnect();
            }
            setIsConnected(false);
            return;
        }

        const socket = new SockJS('http://localhost:8080/ws');
        const client = Stomp.over(socket);

        const headers = {
            'Authorization': `Bearer ${token}`,
        };

        client.connect(headers, (frame) => {
            console.log('Connected: ' + frame);
            setIsConnected(true);

            client.subscribe('/topic/greetings', (greeting) => {
                onMessageReceived(greeting.body);
            });
        }, (error) => {
            console.error('Connection error:', error);
            setIsConnected(false);
            // Handle unauthorized or other connection errors
            if (error.includes("Who are you")) { // Customize this based on your backend error handling
                // Token might be invalid, force logout
                localStorage.removeItem('jwtToken');
                window.location.reload();
            }
        });

        stompClientRef.current = client;

        return () => {
            if (stompClientRef.current) {
                stompClientRef.current.disconnect();
            }
        };
    }, [onMessageReceived, token]); // Add 'token' to the dependency array

    const sendMessage = (message) => {
        if (stompClientRef.current && isConnected && message) {
            stompClientRef.current.send('/app/hello', {}, message);
        }
    };

    return { sendMessage, isConnected };
};

export default WebSocketComponent;