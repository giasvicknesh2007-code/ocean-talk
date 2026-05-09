const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
    roomId: {
        type: String,
        default: "global",
        index: true
    },
    username: {
        type: String,
        required: true
    },
    messageType: {
        type: String,
        enum: ["text", "image"],
        default: "text"
    },
    text: {
        type: String,
        required: function() { return this.messageType === "text"; }
    },
    mediaUrl: {
        type: String
    },
    timestamp: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ["sent", "delivered", "read"],
        default: "sent"
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Message", messageSchema);
