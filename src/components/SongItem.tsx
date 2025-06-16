type SongItemProps = {
    trackId: string;
    title: string;
    artist: string;
    image: string;
    isVoted: boolean;
    animating: boolean;
    voteCount?: number;
    disabled?: boolean;
    onVote: () => void;
};

export default function SongItem({
    trackId,
    title,
    artist,
    image,
    isVoted,
    animating,
    voteCount,
    disabled,
    onVote
}: SongItemProps) {
    return (
        <li key={trackId} className="song_item">
            <img src={image} alt={title} className="song_cover" />
            <div className="song_info">
                <span className="song_title">{title}</span>
                <span className="song_singer">{artist}</span>
            </div>
            <div className={`song_vote ${disabled ? "disabled" : ""}`} onClick={onVote}>
                {voteCount !== undefined && <span>{voteCount}</span>}
                <i
                    className={`fa-heart ${isVoted ? "fa-solid" : "fa-regular"} ${
                        animating ? "animate-like" : ""
                    }`}
                    style={{ color: isVoted ? "#FF2F40" : "white" }}
                ></i>
            </div>
        </li>
    );
}
