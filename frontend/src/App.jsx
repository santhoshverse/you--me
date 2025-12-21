import React from "react";
import RoomPage from "./pages/RoomPage";
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "PASTE_YOUR_ID_HERE";

export default function App() {
    return <RoomPage />;
}
