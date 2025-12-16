import React, { useEffect, useState, useRef } from 'react';
import { socket } from '../socket';
import { gsap } from 'gsap';

export default function FloatingReactions({ roomId }) {
    const containerRef = useRef(null);

    useEffect(() => {
        const handleReaction = ({ emoji, peerId }) => {
            spawnEmoji(emoji);
        };

        socket.on("floating-emoji", handleReaction);
        return () => socket.off("floating-emoji", handleReaction);
    }, [roomId]);

    const spawnEmoji = (emoji) => {
        if (!containerRef.current) return;

        const el = document.createElement("div");
        el.innerText = emoji;
        el.style.position = "absolute";
        el.style.left = Math.random() * 90 + "%";
        el.style.bottom = "0px";
        el.style.fontSize = "40px";
        el.style.pointerEvents = "none";
        el.style.zIndex = 1000;

        containerRef.current.appendChild(el);

        gsap.to(el, {
            y: - window.innerHeight * 0.8,
            opacity: 0,
            duration: 2 + Math.random(),
            ease: "power1.out",
            onComplete: () => {
                if (el.parentNode) el.parentNode.removeChild(el);
            }
        });
    };

    return (
        <div ref={containerRef} style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            overflow: "hidden",
            zIndex: 9999
        }} />
    );
}
