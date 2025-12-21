import express from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import bcrypt from "bcryptjs";
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

// --- 1. Registration (Traditional) ---
router.post("/signup", async (req, res) => {
    try {
        const { username, email, password, display_name } = req.body;

        if (!email || !password || !username) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Check if user exists
        const existing = await User.findOne({ where: { email } });
        if (existing) return res.status(400).json({ error: "Email already registered" });

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await User.create({
            username,
            email,
            password_hash: hashedPassword,
            display_name: display_name || username,
            avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`
        });

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
        res.status(201).json({ token, userId: user.id, name: user.display_name, username: user.username });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- 2. Login (Traditional) ---
router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email } });

        if (!user || !user.password_hash) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: "Invalid credentials" });

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, userId: user.id, name: user.display_name, username: user.username });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- 3. Demo Login ---
router.post("/demo-login", async (req, res) => {
    try {
        const demoUser = await User.findOne({ where: { username: "demo_user" } });
        let user = demoUser;

        if (!user) {
            user = await User.create({
                username: "demo_user",
                email: "demo@example.com",
                display_name: "Demo Explorers",
                avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo"
            });
        }

        const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" });
        res.json({ token, userId: user.id, name: user.display_name, username: user.username });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- 4. Admin Login ---
router.post("/admin-login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ where: { email, role: 'admin' } });

        if (!user || !user.password_hash) {
            return res.status(403).json({ error: "Access denied" });
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(403).json({ error: "Access denied" });

        const token = jwt.sign({ userId: user.id, role: 'admin' }, JWT_SECRET, { expiresIn: "1d" });
        res.json({ token, userId: user.id, name: user.display_name, username: user.username });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
