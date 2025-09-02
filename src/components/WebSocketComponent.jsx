import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const WebSocketComponent = ({ onMessageReceived, token, chatId }) => {
    const stompClientRef = useRef(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        if (!token || !chatId) {
            if (stompClientRef.current) {
                stompClientRef.current.disconnect();
            }
            setIsConnected(false);
            return;
        }

        const socket = new SockJS(`${API_BASE_URL}/ws`);
        const client = Stomp.over(socket);

        const headers = {
            'Authorization': `Bearer ${token}`,
            'ngrok-skip-browser-warning': 'true'
        };

        if (stompClientRef.current) {
            stompClientRef.current.disconnect();
        }

        client.connect(headers, (frame) => {
            console.log('Connected: ' + frame);
            setIsConnected(true);

            client.subscribe(`/topic/chat/${chatId}`, (message) => {
                onMessageReceived(JSON.parse(message.body));
            });
        }, (error) => {
            console.error('Connection error:', error);
            setIsConnected(false);
        });

        stompClientRef.current = client;

        return () => {
            if (stompClientRef.current) {
                stompClientRef.current.disconnect();
            }
        };
    }, [onMessageReceived, token, chatId]);

    // Updated sendMessage to accept a destination
    const sendMessage = (message, destination) => {
        if (stompClientRef.current && isConnected) {
            stompClientRef.current.send(destination, {}, JSON.stringify(message));
        }
    };

    return { sendMessage, isConnected };
};

export default WebSocketComponent;