import express from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/index.js";
import { generateRandomName } from "../utils/randomName.js";

const router = express.Router();

// JWT Secret - In production, this must be in .env
const JWT_SECRET = process.env.JWT_SECRET || "you_and_me_super_secret_key";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "PASTE_YOUR_ID_HERE";
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// --- Social Login (Find or Create) ---
router.post("/social", async (req, res) => {
    try {
        console.log("-----------------------------------------");
        console.log("📥 RECEIVED SOCIAL LOGIN REQUEST");
        console.log("Body:", JSON.stringify(req.body, null, 2));
        console.log("-----------------------------------------");

        let { provider, providerUserId, email, name, avatarUrl, idToken } = req.body;

        if (!provider) return res.status(400).json({ error: "Missing provider" });

        // --- GOOGLE VERIFICATION ---
        if (provider === "google") {
            if (!idToken) return res.status(400).json({ error: "Missing Google ID Token" });

            try {
                const ticket = await client.verifyIdToken({
                    idToken: idToken,
                    audience: GOOGLE_CLIENT_ID,
                });
                const payload = ticket.getPayload();

                // Override body with verified data
                providerUserId = payload['sub'];
                email = payload['email'];
                name = payload['name'];
                avatarUrl = payload['picture'];
                console.log(`✅ Google Token Verified: ${email}`);
            } catch (authError) {
                console.error("❌ Google Auth Verification Failed:", authError);
                return res.status(401).json({ error: "Invalid Google token" });
            }
        }
        else if (!providerUserId) {
            // Apple or Simulation fallback
            return res.status(400).json({ error: "Missing providerUserId for non-Google provider" });
        }

        // Derive base name from email if name is sparse or for username uniqueness
        const emailPrefix = email ? email.split("@")[0] : "user";
        const randomSuffix = Math.floor(Math.random() * 90 + 10); // 2-digit number (10-99)
        const finalDisplayName = name || (emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1));

        // 1. Find or Create User
        let [user, created] = await User.findOrCreate({
            where: { provider_user_id: providerUserId },
            defaults: {
                auth_provider: provider,
                email: email,
                display_name: finalDisplayName,
                avatar_url: avatarUrl,
                username: `${emailPrefix.toLowerCase().replace(/[^a-z0-9]/g, "")}${randomSuffix}`
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
        res.status(500).json({
            error: `Server error: ${e.message}`,
            details: e.name,
            stack: process.env.NODE_ENV === 'development' ? e.stack : undefined
        });
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
