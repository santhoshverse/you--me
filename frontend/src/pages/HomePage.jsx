import React from "react";
import { Link } from "react-router-dom";

export default function HomePage() {
    return (
        <div style={{ textAlign: "center", marginTop: 80 }}>
            <h1>Welcome to You&Me Rooms</h1>
            <p>Create a room and enjoy together!</p>

            <Link to="/create">
                <button style={btnStyle}>Create Room</button>
            </Link>

            <Link to="/rooms">
                <button style={btnStyle2}>Browse Public Rooms</button>
            </Link>
        </div>
    );
}

const btnStyle2 = {
    padding: "14px 24px",
    marginTop: "20px",
    fontSize: "18px",
    background: "#0099ff",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer"
};

const btnStyle = {
    padding: "14px 24px",
    fontSize: "18px",
    background: "#7a35f0",
    color: "white",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer"
};
