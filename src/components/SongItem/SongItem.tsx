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
    return (
        <li className="song_item" style={{ ["--i" as any]: index }}>
            <img src={cover} alt={title} className="song_cover" />
            <div className="song_info">
                <span className="song_title">{title}</span>
                <span>{artist}</span>
            </div>

            {onVote && (
                <div
                    className={`song_vote ${disabled ? "disabled" : ""}`}
                    onClick={() => {
                        if (!disabled) onVote();
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
