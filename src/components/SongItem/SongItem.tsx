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
    onAddRecommended?: () => void;
    onRemoveRecommended?: () => void;
    onMoveUp?: () => void;
    onMoveDown?: () => void;
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
    onTogglePlayed,
    onAddRecommended,
    onRemoveRecommended,
    onMoveUp,
    onMoveDown
}: Props) {
    return (
        <li className={`song_item ${played ? "played" : ""}`} style={{ ["--i" as string]: index }}>
            <img src={cover} alt={title} className="song_cover" />
            <div className="song_info">
                <span className="song_title">{title}</span>
                <span className="song_singer">{artist}</span>
            </div>

            <div className="song_buttons_container">
                {played ? (
                    <div
                        className="song_toggle_played"
                        onClick={() => {
                            if (isAdmin && onTogglePlayed) onTogglePlayed();
                        }}
                        title="Segna come NON cantata"
                    >
                        <i className="fa-solid fa-square-check" style={{ color: "#7CFC00" }}></i>
                    </div>
                ) : (
                    <>
                        {onVote && (
                            <div
                                className={`song_vote ${disabled ? "disabled" : ""}`}
                                onClick={() => {
                                    if (!disabled) onVote();
                                }}
                                title="Metti like"
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

                        {isAdmin && onTogglePlayed && (
                            <div
                                className="song_toggle_played"
                                onClick={onTogglePlayed}
                                title="Segna come cantata"
                            >
                                <i className="fa-solid fa-square-check"></i>
                            </div>
                        )}

                        {isAdmin && onAddRecommended && (
                            <div
                                className="song_admin_action"
                                onClick={onAddRecommended}
                                title="Aggiungi ai consigli"
                            >
                                <i className="fa-solid fa-plus"></i>
                            </div>
                        )}
                    </>
                )}

                <div className="edit_buttons_container">
                    {isAdmin && onRemoveRecommended && (
                        <div
                            className="song_admin_delete"
                            onClick={onRemoveRecommended}
                            title="Rimuovi dai consigli"
                        >
                            <i className="fa-solid fa-trash"></i>
                        </div>
                    )}

                    {isAdmin && (onMoveUp || onMoveDown) && (
                        <>
                            {onMoveUp && (
                                <div
                                    className="song_admin_sort"
                                    onClick={onMoveUp}
                                    title="Sposta su"
                                >
                                    <i className="fa-solid fa-arrow-up"></i>
                                </div>
                            )}
                            {onMoveDown && (
                                <div
                                    className="song_admin_sort"
                                    onClick={onMoveDown}
                                    title="Sposta giù"
                                >
                                    <i className="fa-solid fa-arrow-down"></i>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </li>
    );
}
