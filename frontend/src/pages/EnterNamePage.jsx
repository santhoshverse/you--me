import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { generateRandomName } from "../utils/randomName";

export default function EnterNamePage() {
    const [name, setName] = useState(generateRandomName());
    const navigate = useNavigate();

    async function submitName() {
        const res = await fetch("http://localhost:4000/api/rooms/guest", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name })
        });

        const data = await res.json();

        localStorage.setItem("userId", data.userId);
        localStorage.setItem("name", data.name);

        navigate("/create");
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
