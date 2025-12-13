import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateRandomName } from "../utils/randomName";

export default function EnterNamePage() {
    const [name, setName] = useState(generateRandomName());
    const navigate = useNavigate();

    async function submitName() {
        try {
            const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
            console.log("Connecting to:", BACKEND_URL); // Debug log

            const res = await fetch(`${BACKEND_URL}/api/rooms/guest`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name })
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || `Server error: ${res.status}`);
            }

            const data = await res.json();
            console.log("Response:", data); // Debug log

            if (data.success) {
                localStorage.setItem("userId", data.userId);
                localStorage.setItem("name", data.name);
                navigate("/create");
            } else {
                alert("Failed to register guest user.");
            }
        } catch (err) {
            console.error("Error submitting name:", err);
            // Show the exact URL we tried to hit to debug env vars
            const targetUrl = `${import.meta.env.VITE_BACKEND_URL || "UNDEFINED (Using localhost)"}/api/rooms/guest`;
            alert(`Connection Failed!\n\nTrying to reach:\n${targetUrl}\n\nError:\n${err.message}`);
        }
    }

    return (
        <div style={container}>
            <h1>Welcome to You&Me</h1>
            <p>Enter your display name before joining rooms</p>

            <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={input}
            />

            <button onClick={submitName} style={btn}>
                Continue
            </button>
        </div>
    );
}

const container = {
    textAlign: "center",
    marginTop: "100px",
    color: "white"
};

const input = {
    padding: "10px",
    fontSize: "20px",
    borderRadius: "8px",
    border: "none",
    marginTop: "20px",
    width: "280px"
};

const btn = {
    padding: "12px 24px",
    marginTop: "20px",
    fontSize: "18px",
    borderRadius: "8px",
    border: "none",
    background: "#7a35f0",
    color: "white",
    cursor: "pointer"
};
