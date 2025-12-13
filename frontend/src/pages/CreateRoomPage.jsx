import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { socket } from "../socket";

export default function CreateRoomPage() {
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    async function createRoom() {
        setLoading(true);

        const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
        const res = await fetch(`${BACKEND_URL}/api/rooms/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
        });

        const data = await res.json();
        if (data.success) {
            navigate(`/room/${data.roomId}`);
        }
    }

    return (
        <div style={{ textAlign: "center", marginTop: 80 }}>
            <h2>Create a new room</h2>
            <button onClick={createRoom} style={btnStyle}>
                {loading ? "Creating..." : "Create Room"}
            </button>
        </div>
    );
}

const btnStyle = {
    padding: "12px 24px",
    background: "#4caf50",
    fontSize: "18px",
    borderRadius: "8px",
    border: "none",
    color: "white",
    cursor: "pointer"
};
