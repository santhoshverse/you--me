import express from "express";
import { User } from "../models/index.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Signup
router.post("/signup", async (req, res) => {
    try {
        const { username, password, confirmPassword, display_name, email } = req.body;

        // Validation
        if (!username || !password || !confirmPassword || !email) {
            return res.status(400).json({ error: "All fields are required" });
        }
        if (password !== confirmPassword) {
            return res.status(400).json({ error: "Passwords do not match" });
        }

        const existing = await User.findOne({ where: { username } });
        if (existing) return res.status(400).json({ error: "Username already taken" });

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

// Social Login Placeholder
router.post("/social", async (req, res) => {
    // Placeholder for Google/Apple auth logic
    res.status(501).json({ error: "Social login coming soon!" });
});

export default router;
