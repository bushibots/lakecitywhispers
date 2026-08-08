import { io } from 'socket.io-client';
import { API_URL } from './api';

// Create a single socket instance
// We don't auto-connect until we have a user to join a room for.
export const socket = io(API_URL.replace('/api', ''), {
    autoConnect: true, // We can auto-connect and emit join later
});

export const joinSocketRoom = (userId) => {
    if (userId) {
        socket.emit('join', { user_id: userId });
    }
};
