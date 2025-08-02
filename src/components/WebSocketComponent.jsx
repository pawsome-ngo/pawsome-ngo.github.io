import { useEffect, useRef, useState } from 'react';
import SockJS from 'sockjs-client';
import { Stomp } from '@stomp/stompjs';

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

        const socket = new SockJS('http://localhost:8080/ws');
        const client = Stomp.over(socket);

        const headers = {
            'Authorization': `Bearer ${token}`,
        };

        // Disconnect from any previous chat before connecting to a new one
        if (stompClientRef.current) {
            stompClientRef.current.disconnect();
        }

        client.connect(headers, (frame) => {
            console.log('Connected: ' + frame);
            setIsConnected(true);

            // Subscribe to the specific chat group topic
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

    const sendMessage = (message) => {
        if (stompClientRef.current && isConnected && chatId) {
            stompClientRef.current.send(`/app/chat/${chatId}`, {}, JSON.stringify(message));
        }
    };

    return { sendMessage, isConnected };
};

export default WebSocketComponent;