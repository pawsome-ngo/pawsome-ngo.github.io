// File: pawsome-client-react/src/hooks/useWebSocket.js
import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const useWebSocket = ({ onMessageReceived, token, chatId, topic }) => {
    const stompClientRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const subscriptionTopic = topic ? topic : (chatId ? `/topic/chat/${chatId}` : null);
        console.log(`useWebSocket Effect: Determined subscription topic: ${subscriptionTopic}`); // Log topic

        if (!token || !subscriptionTopic) {
            console.log("useWebSocket Effect: No token or topic, disconnecting.");
            if (stompClientRef.current) {
                stompClientRef.current.disconnect();
            }
            setIsConnected(false);
            return;
        }

        console.log("useWebSocket Effect: Attempting to connect...");
        const socket = new SockJS(`${API_BASE_URL}/ws`);
        const client = Stomp.over(socket);

        if (import.meta.env.PROD) { client.debug = () => {}; }

        const headers = { 'Authorization': `Bearer ${token}` };

        if (stompClientRef.current) {
            console.log("useWebSocket Effect: Disconnecting previous client.");
            stompClientRef.current.disconnect();
        }

        client.connect(headers, (frame) => {
            console.log(`useWebSocket Effect: WebSocket Connected: ${frame}, Subscribing to ${subscriptionTopic}`);
            setIsConnected(true);
            client.subscribe(subscriptionTopic, (message) => {
                console.log(`useWebSocket: Received message on ${subscriptionTopic}:`, message.body); // Log received message
                onMessageReceived(JSON.parse(message.body));
            });
        }, (error) => {
            console.error('useWebSocket Effect: WebSocket Connection error:', error);
            setIsConnected(false);
        });

        stompClientRef.current = client;

        return () => {
            if (stompClientRef.current) {
                stompClientRef.current.disconnect();
                console.log("useWebSocket Cleanup: WebSocket Disconnected");
            }
        };
    }, [onMessageReceived, token, chatId, topic]);

    const sendMessage = (message, destination) => {
        // --- ADD LOGGING HERE ---
        console.log(`useWebSocket sendMessage: Attempting to send to destination: ${destination}`);
        console.log(`useWebSocket sendMessage: Payload:`, message);
        // --- END LOGGING ---

        if (stompClientRef.current && isConnected) {
            try {
                stompClientRef.current.send(destination, {}, JSON.stringify(message));
                console.log(`useWebSocket sendMessage: Message sent successfully.`);
            } catch (error) {
                console.error(`useWebSocket sendMessage: Error sending message:`, error);
            }
        } else {
            console.error("useWebSocket sendMessage: Cannot send message: WebSocket not connected or client invalid.");
        }
    };

    return { sendMessage, isConnected };
};

export default useWebSocket;