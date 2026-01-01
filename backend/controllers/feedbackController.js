import Feedback from "../models/feedback.js";

export const submitFeedback = async (req, res) => {
    try {
        const { name, email, type, message } = req.body;

        if (!name || !email || !message) {
            return res.status(400).json({ error: "Name, email, and message are required." });
        }

        const newFeedback = await Feedback.create({
            name,
            email,
            type: type || 'other',
            message
        });

        res.status(201).json({
            success: true,
            message: "Feedback submitted successfully!",
            feedback: newFeedback
        });
    } catch (error) {
        console.error("Error saving feedback:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
