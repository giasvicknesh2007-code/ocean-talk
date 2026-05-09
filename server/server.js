require("dotenv").config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const connectDB = require("./config/db");
const Message = require("./models/Message");
const User = require("./models/User");
const authRoutes = require("./routes/auth");

// Initialize App
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" },
    maxHttpBufferSize: 1e7 // 10MB limit for base64 images simulation
});

// Connect to Database
connectDB();

// Middleware
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "../public")));

// Routes
app.use("/api/auth", authRoutes);

// State Management
const onlineUsers = new Map(); // userId -> { username, socketId, currentRoomId }

// Socket.io Middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error"));
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error("Authentication error"));
        socket.user = decoded;
        next();
    });
});

// Socket.io Logic
io.on("connection", async (socket) => {
    onlineUsers.set(socket.user.id, {
        id: socket.user.id,
        socketId: socket.id,
        username: socket.user.username,
        currentRoomId: "global"
    });
    
    io.emit("online users", Array.from(onlineUsers.values()));
    socket.join("global");

    socket.on("get messages", async (roomId) => {
        try {
            const messages = await Message.find({ roomId }).sort({ createdAt: 1 }).limit(50);
            await Message.updateMany(
                { roomId, username: { $ne: socket.user.username }, status: { $ne: "read" } },
                { $set: { status: "read" } }
            );
            socket.emit("previous messages", { roomId, messages });
            socket.to(roomId).emit("messages read", { roomId, reader: socket.user.username });
        } catch (err) {
            console.error(err);
        }
    });

    socket.on("join room", (roomId) => {
        socket.join(roomId);
        const userData = onlineUsers.get(socket.user.id);
        if (userData) userData.currentRoomId = roomId;
    });

    socket.on("chat message", async (data) => {
        const { text, timestamp, roomId = "global", messageType = "text", mediaUrl } = data;
        
        try {
            const newMessage = new Message({
                roomId,
                username: socket.user.username,
                messageType,
                text,
                mediaUrl,
                timestamp,
                status: "sent"
            });

            // Delivery logic
            if (roomId.startsWith("dm_")) {
                const ids = roomId.replace("dm_", "").split("_");
                const recipientId = ids.find(id => id !== socket.user.id);
                const recipientData = onlineUsers.get(recipientId);
                if (recipientData) {
                    newMessage.status = "delivered";
                    if (recipientData.currentRoomId === roomId) newMessage.status = "read";
                }
            } else if (onlineUsers.size > 1) {
                newMessage.status = "delivered";
            }

            await newMessage.save();
            io.to(roomId).emit("chat message", newMessage);
        } catch (err) {
            console.error(err);
        }
    });

    socket.on("mark as read", async (roomId) => {
        try {
            await Message.updateMany(
                { roomId, username: { $ne: socket.user.username }, status: { $ne: "read" } },
                { $set: { status: "read" } }
            );
            socket.to(roomId).emit("messages read", { roomId, reader: socket.user.username });
        } catch (err) {
            console.error(err);
        }
    });

    socket.on("typing", (roomId) => {
        socket.to(roomId).emit("typing", { username: socket.user.username, roomId });
    });

    socket.on("stop typing", (roomId) => {
        socket.to(roomId).emit("stop typing", { username: socket.user.username, roomId });
    });

    socket.on("disconnect", async () => {
        const userId = socket.user.id;
        onlineUsers.delete(userId);
        try {
            await User.findByIdAndUpdate(userId, { lastSeen: new Date() });
        } catch (err) {}
        io.emit("online users", Array.from(onlineUsers.values()));
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
