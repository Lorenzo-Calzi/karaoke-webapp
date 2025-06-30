import React, { useState, useEffect } from "react";
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
};

type AnimationState = "initial" | "visible";

export default function SongItem({
    index,
    title,
    artist,
    cover,
    voted,
    animating,
    onVote,
    voteCount,
    disabled
}: Props) {
    const [animationState, setAnimationState] = useState<AnimationState>("initial");

    useEffect(() => {
        // Triggera l'animazione dopo un breve delay per permettere il mount
        const timer = setTimeout(() => {
            setAnimationState("visible");
        }, 50);

        return () => clearTimeout(timer);
    }, []);

    const handleAnimationEnd = () => {
        // L'animazione CSS è terminata, ora gli elementi sono completamente interattivi
        setAnimationState("visible");
    };

    const handleVoteClick = () => {
        // Permetti il click solo se non è disabled e l'animazione è iniziata
        if (!disabled && onVote) {
            onVote();
        }
    };

    return (
        <li
            className={`song_item ${animationState}`}
            style={{
                ["--i" as any]: index,
                // Fallback inline per il fix iOS
                pointerEvents: animationState === "visible" ? "auto" : "none"
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
