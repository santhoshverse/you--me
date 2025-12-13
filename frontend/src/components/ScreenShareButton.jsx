import React from "react";
import { socket } from "../socket";

export default function ScreenShareButton({ startShare, stopShare, isSharing }) {
    return (
        <button
            onClick={() => (isSharing ? stopShare() : startShare())}
            style={{
                padding: "10px 20px",
                margin: "10px",
                background: isSharing ? "#ff4d4d" : "#4caf50",
                border: "none",
                borderRadius: "8px",
                color: "white",
                cursor: "pointer"
            }}
        >
            {isSharing ? "Stop Screen Share" : "Share Screen"}
        </button>
    );
}
