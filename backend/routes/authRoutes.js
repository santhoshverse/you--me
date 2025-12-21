import express from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/index.js";

const router = express.Router();

// JWT Secret - In production, this must be in .env
const JWT_SECRET = process.env.JWT_SECRET || "you_and_me_super_secret_key";

// --- Social Login (Find or Create) ---
router.post("/social", async (req, res) => {
    try {
        console.log("-----------------------------------------");
        console.log("📥 RECEIVED SOCIAL LOGIN REQUEST");
        console.log("Body:", JSON.stringify(req.body, null, 2));
        console.log("-----------------------------------------");

        const { provider, providerUserId, email, name, avatarUrl } = req.body;

        if (!provider || !providerUserId || !name) {
            return res.status(400).json({ error: "Missing required social auth fields" });
        }

        // 1. Find or Create User
        let [user, created] = await User.findOrCreate({
            where: { provider_user_id: providerUserId },
            defaults: {
                auth_provider: provider,
                email: email,
                display_name: name,
                avatar_url: avatarUrl,
                username: `user_${providerUserId.substring(0, 8)}` // Auto-generated username
            }
        });

        if (!created) {
            console.log(`✅ User found: ${user.display_name}`);
            // Optional: Update name/email if they changed
            user.display_name = name;
            if (email) user.email = email;
            await user.save();
        } else {
            console.log(`✨ New user created via ${provider}: ${user.display_name}`);
        }

        // 2. Generate JWT Session
        const token = jwt.sign(
            { userId: user.id, name: user.display_name, provider: provider },
            JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.json({
            token,
            userId: user.id,
            name: user.display_name,
            username: user.username,
            avatarUrl: user.avatar_url
        });

    } catch (e) {
        console.error("❌ Social Auth Error:", e);
        res.status(500).json({ error: `Server error: ${e.message}` });
    }
});

// --- Verify Session ---
router.get("/me", async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const token = authHeader.split(" ")[1];
        const decoded = jwt.verify(token, JWT_SECRET);

        const user = await User.findByPk(decoded.userId);
        if (!user) return res.status(404).json({ error: "User no longer exists" });

        res.json({
            userId: user.id,
            name: user.display_name,
            username: user.username,
            avatarUrl: user.avatar_url
        });
    } catch (e) {
        res.status(401).json({ error: "Invalid or expired token" });
    }
});

// Legacy routes removed to stop 400/401 loops
router.post("/signup", (req, res) => res.status(501).json({ error: "Manual signup disabled. Use Social Login." }));
router.post("/login", (req, res) => res.status(501).json({ error: "Manual login disabled. Use Social Login." }));

export default router;
