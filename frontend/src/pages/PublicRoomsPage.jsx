import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { socket } from "../socket";

export default function PublicRoomsPage() {
    const [rooms, setRooms] = useState([]);

    function loadRooms() {
        fetch("http://localhost:4000/api/rooms")
            .then(res => res.json())
            .then(data => {
                if (data.success) setRooms(data.rooms);
            });
    }

    useEffect(() => {
        loadRooms();
        socket.on("room-updated", loadRooms);
        return () => socket.off("room-updated", loadRooms);
    }, []);

    return (
        <div style={container}>
            <h1>Public Rooms</h1>

            <div style={grid}>
                {rooms.map(room => (
                    <Link
                        key={room.roomId}
                        to={`/room/${room.roomId}`}
                        style={{ textDecoration: "none" }}
                    >
                        <div style={card}>
                            <h3 style={{ color: "white" }}>{room.name}</h3>

                            <p style={sub}>Users: {room.members}</p>

                            {room.media && (
                                <p style={sub}>🎬 Watching: YouTube Video</p>
                            )}

                            {room.screen && (
                                <p style={sub}>🖥 Screen Sharing Active</p>
                            )}
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

const container = {
    padding: "40px",
    color: "white",
};

const grid = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: "20px"
};

const card = {
    padding: "20px",
    background: "#1a1a1a",
    borderRadius: "12px",
    border: "2px solid #333",
    cursor: "pointer",
};

const sub = {
    color: "#bbb",
    fontSize: "14px"
};
