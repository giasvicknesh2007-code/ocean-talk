const express = require("express");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

// Register
router.post("/signup", async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Check if user exists
        let user = await User.findOne({ username });
        if (user) return res.status(400).json({ message: "User already exists" });

        user = new User({ username, password });
        await user.save();

        const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.status(201).json({ token, username: user.username, userId: user._id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Login
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await User.findOne({ username });
        if (!user) return res.status(400).json({ message: "Invalid credentials" });

        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = jwt.sign({ id: user._id, username: user.username }, process.env.JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, username: user.username, userId: user._id });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
