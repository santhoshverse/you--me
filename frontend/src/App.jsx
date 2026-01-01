import React from "react";
import RoomPage from "./pages/RoomPage";
import FeedbackPage from "./pages/FeedbackPage";

export default function App() {
    return (
        <Routes>
            <Route path="/room/:roomId" element={<RoomPage />} />
            <Route path="/feedback" element={<FeedbackPage />} />
            {/* Fallback or other routes if needed, but original App just rendered RoomPage directly or maybe wrapped components. 
                Wait, checking original App.jsx content... 
                Original content was just: export default function App() { return <RoomPage />; } 
                I need to restructure it to use Routes if it wasn't already. 
                Let me check previous tool output for App.jsx content. 
                Step 17 showed:
                1: import React from "react";
                2: import RoomPage from "./pages/RoomPage";
                3: 
                4: export default function App() {
                5:     return <RoomPage />;
                6: }
                
                The user seems to be using react-router-dom in other files (CreateRoomPage imports useNavigate), so Router must be in main.jsx.
                I need to replace the single RoomPage return with Routes. 
                Wait, if App is just returning <RoomPage />, then where are Home/CreateRoom pages rendered?
                Maybe App is NOT the root or `main.jsx` handles routing?
                Let me check `main.jsx` first before modifying App.jsx blindly.
            */}
            <Route path="*" element={<RoomPage />} />
        </Routes>
    );
}
