import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage.jsx";
import CreateRoomPage from "./pages/CreateRoomPage.jsx";
import RoomPage from "./pages/RoomPage.jsx";

import "./styles.css";
import PublicRoomsPage from "./pages/PublicRoomsPage.jsx";
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "PASTE_YOUR_ID_HERE";

ReactDOM.createRoot(document.getElementById("root")).render(
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<CreateRoomPage />} />
                <Route path="/create" element={<CreateRoomPage />} />
                <Route path="/rooms" element={<PublicRoomsPage />} />
                <Route path="/room/:roomId" element={<RoomPage />} />
            </Routes>
        </BrowserRouter>
    </GoogleOAuthProvider>
);
