import express from "express";
import { User } from "../models/index.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Signup
router.post("/signup", async (req, res) => {
    try {
        const { username, password, display_name, email } = req.body;
        // Check if user exists
        const existing = await User.findOne({ where: { username } });
        if (existing) return res.status(400).json({ error: "Username already taken" });

        // In a real app, use bcrypt here. For now, simple string for MVP if restricted.
        const user = await User.create({
            username,
            password_hash: password, // TODO: bcrypt
            display_name: display_name || username,
            email
        });

        res.json({ userId: user.id, username: user.username, name: user.display_name });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Login
router.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ where: { username, password_hash: password } });
        if (!user) return res.status(401).json({ error: "Invalid credentials" });

        res.json({ userId: user.id, username: user.username, name: user.display_name });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Guest
router.post("/guest", async (req, res) => {
    try {
        const { name } = req.body;
        // For guest, we create a temporary user record or just return a session
        const user = await User.create({
            display_name: name || "Guest",
            username: `guest_${uuidv4().substring(0, 8)}`
        });
        res.json({ userId: user.id, name: user.display_name, isGuest: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
