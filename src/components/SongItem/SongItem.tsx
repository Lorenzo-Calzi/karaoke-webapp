import React, { useState, useEffect, useRef } from "react";
import "./songItem.scss";

type Props = {
    index: number;
    title: string;
    artist: string;
    cover: string;
    voted?: boolean;
    animating?: boolean;
    onVote?: () => void;
    voteCount?: number;
    disabled?: boolean;
    // Nuova prop per re-triggerare l'animazione
    animationKey?: string | number; // Cambia questo valore per riavviare l'animazione
};

type AnimationState = "hidden" | "animating" | "visible";

export default function SongItem({
    index,
    title,
    artist,
    cover,
    voted,
    animating,
    onVote,
    voteCount,
    disabled,
    animationKey
}: Props) {
    const [animationState, setAnimationState] = useState<AnimationState>("hidden");
    const elementRef = useRef<HTMLLIElement>(null);

    useEffect(() => {
        // Reset e riavvia l'animazione ogni volta che cambia animationKey
        setAnimationState("hidden");

        // Forza un reflow per resettare l'animazione CSS
        if (elementRef.current) {
            elementRef.current.offsetHeight; // Trigger reflow
        }

        // Avvia l'animazione dopo un frame
        const timer = requestAnimationFrame(() => {
            setAnimationState("animating");
        });

        return () => cancelAnimationFrame(timer);
    }, [animationKey]); // Riavvia quando cambia animationKey

    const handleAnimationEnd = (e: React.AnimationEvent) => {
        // Assicurati che l'evento provenga dall'elemento principale
        if (e.target === elementRef.current && e.animationName === "fadeInUp") {
            setAnimationState("visible");
        }
    };

    const handleVoteClick = () => {
        // Permetti il click solo se l'animazione è completata e non è disabled
        if (animationState === "visible" && !disabled && onVote) {
            onVote();
        }
    };

    const isInteractionEnabled = animationState === "visible" && !disabled;

    return (
        <li
            ref={elementRef}
            className={`song_item ${animationState}`}
            style={{
                ["--i" as any]: index,
                // Fallback inline per il fix iOS
                pointerEvents: isInteractionEnabled ? "auto" : "none"
            }}
            onAnimationEnd={handleAnimationEnd}
        >
            <img src={cover} alt={title} className="song_cover" />
            <div className="song_info">
                <span className="song_title">{title}</span>
                <span>{artist}</span>
            </div>

            {onVote && (
                <div
                    className={`song_vote ${disabled ? "disabled" : ""}`}
                    onClick={handleVoteClick}
                    style={{
                        pointerEvents: isInteractionEnabled ? "auto" : "none"
                    }}
                >
                    {voteCount !== undefined && <span className="vote_count">{voteCount}</span>}
                    <i
                        className={`fa-heart ${voted ? "fa-solid" : "fa-regular"} ${
                            animating ? "animate-like" : ""
                        }`}
                        style={{ color: voted ? "#FF2F40" : "white" }}
                    ></i>
                </div>
            )}
        </li>
    );
}
