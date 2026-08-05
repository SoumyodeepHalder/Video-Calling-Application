// Install required packages: npm install express socket.io
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" } // Allows cross-origin development testing
});

let activeRooms = {};

io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Join a video chat session room
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        
        if (!activeRooms[roomId]) {
            activeRooms[roomId] = [];
        }
        activeRooms[roomId].push(socket.id);

        // If another person is already in the room, notify them to initiate the WebRTC handshake
        if (activeRooms[roomId].length > 1) {
            const peerId = activeRooms[roomId].find(id => id !== socket.id);
            socket.to(peerId).emit('peer-joined', socket.id);
        }
    });

    // Pass WebRTC Session Description Protocol (SDP) offers/answers
    socket.on('signal', (data) => {
        socket.to(data.to).emit('signal', {
            from: socket.id,
            signal: data.signal
        });
    });

    // Handle sudden disconnects cleanups
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        for (const roomId in activeRooms) {
            activeRooms[roomId] = activeRooms[roomId].filter(id => id !== socket.id);
            if (activeRooms[roomId].length === 0) {
                delete activeRooms[roomId];
            } else {
                // Notify remaining participants to drop the media stream pipeline
                socket.to(roomId).emit('peer-left', socket.id);
            }
        }
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Signaling server running on port ${PORT}`);
});
