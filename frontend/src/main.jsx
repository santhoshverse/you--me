import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import HomePage from "./pages/HomePage.jsx";
import CreateRoomPage from "./pages/CreateRoomPage.jsx";
import RoomPage from "./pages/RoomPage.jsx";

import "./styles.css";
import AuthPage from "./pages/AuthPage.jsx";
import PublicRoomsPage from "./pages/PublicRoomsPage.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
    <BrowserRouter>
        <Routes>
            <Route path="/" element={<CreateRoomPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/create" element={<CreateRoomPage />} />
            <Route path="/rooms" element={<PublicRoomsPage />} />
            <Route path="/room/:roomId" element={<RoomPage />} />
        </Routes>
    </BrowserRouter>
);
