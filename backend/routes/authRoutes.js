import express from "express";
import { User } from "../models/index.js";

const router = express.Router();

// Signup
router.post("/signup", async (req, res) => {
    try {
        console.log("-----------------------------------------");
        console.log("📥 RECEIVED SIGNUP REQUEST");
        console.log("Body:", JSON.stringify(req.body, null, 2));
        console.log("-----------------------------------------");

        const { username, email, password, confirmPassword, name } = req.body;
        const actualUsername = username || name;

        // Validation
        if (!actualUsername || !email || !password || !confirmPassword) {
            const missing = [];
            if (!actualUsername) missing.push("username/name");
            if (!email) missing.push("email");
            if (!password) missing.push("password");
            if (!confirmPassword) missing.push("confirmPassword");

            console.warn(`⚠️ Signup failed: Missing fields [${missing.join(", ")}]`);
            return res.status(400).json({
                error: `Missing required fields: ${missing.join(", ")}`,
                received: req.body
            });
        }

        if (password !== confirmPassword) {
            console.warn("⚠️ Signup failed: Passwords do not match");
            return res.status(400).json({ error: "Passwords do not match" });
        }

        // Check if username already exists
        const existingUsername = await User.findOne({ where: { username: actualUsername } });
        if (existingUsername) {
            console.warn(`⚠️ Signup failed: Username ${actualUsername} already taken`);
            return res.status(400).json({ error: "Username already taken" });
        }

        // Check if email already exists
        const existingEmail = await User.findOne({ where: { email: email } });
        if (existingEmail) {
            console.warn(`⚠️ Signup failed: Email ${email} already registered`);
            return res.status(400).json({ error: "Email already registered" });
        }

        const user = await User.create({
            username: actualUsername,
            email,
            password_hash: password, // TODO: bcrypt
            display_name: actualUsername
        });

        console.log(`✅ User created: ${user.username}`);
        res.status(201).json({ userId: user.id, username: user.username, name: user.display_name });
    } catch (e) {
        console.error("❌ Signup crash:", e);
        if (e.name === 'SequelizeUniqueConstraintError') {
            const field = e.errors[0]?.path || "field";
            return res.status(400).json({ error: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists` });
        }
        res.status(500).json({ error: `Server error: ${e.message}` });
    }
});

// Login
router.post("/login", async (req, res) => {
    try {
        console.log("-----------------------------------------");
        console.log("📥 RECEIVED LOGIN REQUEST");
        console.log("Body:", JSON.stringify(req.body, null, 2));
        console.log("-----------------------------------------");

        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: "Missing username or password" });
        }

        const user = await User.findOne({ where: { username: username, password_hash: password } });
        if (!user) {
            console.warn(`⚠️ Invalid credentials for: ${username}`);
            return res.status(401).json({ error: "Invalid credentials" });
        }

        console.log(`✅ User logged in: ${user.username}`);
        res.json({ userId: user.id, username: user.username, name: user.display_name });
    } catch (e) {
        console.error("❌ Login crash:", e);
        res.status(500).json({ error: e.message });
    }
});

// Social Login Placeholder
router.post("/social", async (req, res) => {
    res.status(501).json({ error: "Social login coming soon!" });
});

export default router;
