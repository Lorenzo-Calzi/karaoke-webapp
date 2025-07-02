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
    isAdmin?: boolean;
    played?: boolean;
    onTogglePlayed?: () => void;
};

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
    isAdmin,
    played,
    onTogglePlayed
}: Props) {
    return (
        <li className={`song_item ${played ? "played" : ""}`} style={{ ["--i" as any]: index }}>
            <img src={cover} alt={title} className="song_cover" />
            <div className="song_info">
                <span className="song_title">{title}</span>
                <span>{artist}</span>
            </div>

            <div className="song_buttons_container">
                {/* Se la canzone è già stata suonata */}
                {played ? (
                    <div
                        className="song_toggle_played"
                        onClick={() => {
                            if (isAdmin && onTogglePlayed) {
                                onTogglePlayed();
                            }
                        }}
                    >
                        <i className="fa-solid fa-square-check" style={{ color: "#7CFC00" }}></i>
                    </div>
                ) : (
                    <>
                        {/* Bottone like (solo se played è false) */}
                        {onVote && (
                            <div
                                className={`song_vote ${disabled ? "disabled" : ""}`}
                                onClick={() => {
                                    if (!disabled) onVote();
                                }}
                            >
                                {voteCount !== undefined && (
                                    <span className="vote_count">{voteCount}</span>
                                )}
                                <i
                                    className={`fa-heart ${voted ? "fa-solid" : "fa-regular"} ${
                                        animating ? "animate-like" : ""
                                    }`}
                                    style={{ color: voted ? "#FF2F40" : "white" }}
                                ></i>
                            </div>
                        )}

                        {/* Checkbox vuota (solo admin, se played === false) */}
                        {isAdmin && (
                            <div className="song_toggle_played" onClick={onTogglePlayed}>
                                <i className="fa-solid fa-square-check"></i>
                            </div>
                        )}
                    </>
                )}
            </div>
        </li>
    );
}
