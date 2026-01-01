import React from "react";
import { Link } from "react-router-dom";

export default function FAQPage() {
    return (
        <div style={containerStyle}>
            <div style={contentWrapper}>
                <Link to="/" style={backLink}>← Back to Home</Link>

                <h1 style={titleStyle}>Frequently Asked Questions</h1>

                <div style={faqContainer}>
                    <div style={faqItem}>
                        <h3 style={questionStyle}>Is it free?</h3>
                        <p style={answerStyle}>Yes. You can watch videos and share your screen for free.</p>
                    </div>

                    <div style={faqItem}>
                        <h3 style={questionStyle}>Do friends need an account?</h3>
                        <p style={answerStyle}>No. Your friends can join your room instantly without signing up.</p>
                    </div>

                    <div style={faqItem}>
                        <h3 style={questionStyle}>Does it work on mobile?</h3>
                        <p style={answerStyle}>Yes. You can join rooms and watch content on Chrome, Firefox, and Safari for mobile.</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

const containerStyle = {
    minHeight: "100vh",
    width: "100vw",
    background: "radial-gradient(circle at top left, #1a1a2e, #16213e, #0f3460)",
    color: "white",
    fontFamily: "'Inter', sans-serif",
    padding: "40px 20px",
    boxSizing: "border-box"
};

const contentWrapper = {
    maxWidth: "800px",
    margin: "0 auto"
};

const backLink = {
    color: "#aaa",
    textDecoration: "none",
    fontSize: "14px",
    marginBottom: "40px",
    display: "inline-block",
    transition: "color 0.2s"
};

const titleStyle = {
    fontSize: "36px",
    fontWeight: "800",
    marginBottom: "40px",
    background: "linear-gradient(45deg, #fff, #7a35f0)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent"
};

const faqContainer = {
    display: "flex",
    flexDirection: "column",
    gap: "30px"
};

const faqItem = {
    background: "rgba(255, 255, 255, 0.05)",
    padding: "25px",
    borderRadius: "16px",
    border: "1px solid rgba(255, 255, 255, 0.1)"
};

const questionStyle = {
    fontSize: "20px",
    fontWeight: "600",
    marginBottom: "10px",
    color: "#fff"
};

const answerStyle = {
    fontSize: "16px",
    color: "#ccc",
    lineHeight: "1.6"
};
