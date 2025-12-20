import express from "express";
import { User } from "../models/index.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// Signup
router.post("/signup", async (req, res) => {
    try {
        console.log("📥 Signup attempt:", req.body);
        const { username, password, confirmPassword, display_name, email } = req.body;

        // Validation
        if (!username || !password || !confirmPassword || !email) {
            console.warn("⚠️ Signup failed: Missing fields");
            return res.status(400).json({ error: "Missing required fields: username, password, or email" });
        }
        if (password !== confirmPassword) {
            console.warn("⚠️ Signup failed: Passwords do not match");
            return res.status(400).json({ error: "Passwords do not match" });
        }

        const existingUsername = await User.findOne({ where: { username } });
        if (existingUsername) {
            console.warn(`⚠️ Signup failed: Username ${username} already taken`);
            return res.status(400).json({ error: "Username already taken" });
        }

        const existingEmail = await User.findOne({ where: { email } });
        if (existingEmail) {
            console.warn(`⚠️ Signup failed: Email ${email} already registered`);
            return res.status(400).json({ error: "Email already registered" });
        }

        const user = await User.create({
            username,
            password_hash: password, // TODO: bcrypt
            display_name: display_name || username,
            email
        });

        console.log(`✅ User created: ${user.username}`);
        res.json({ userId: user.id, username: user.username, name: user.display_name });
    } catch (e) {
        console.error("❌ Signup crash:", e);
        res.status(500).json({ error: `Server error: ${e.message}` });
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
