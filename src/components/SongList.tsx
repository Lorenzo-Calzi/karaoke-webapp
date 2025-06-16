import SongItem from "./SongItem";

type Song = {
    trackId: string;
    trackName: string;
    artistName: string;
    artworkUrl100: string;
    voteCount?: number;
};

type SongListProps = {
    songs: Song[];
    votedSongs: string[];
    animatingId: string | null;
    onVote: (trackId: string, title: string, artist: string, image: string) => void;
    disabledLimit?: boolean;
};

export default function SongList({
    songs,
    votedSongs,
    animatingId,
    onVote,
    disabledLimit
}: SongListProps) {
    return (
        <ul className="song_list">
            {songs.map(song => (
                <SongItem
                    key={song.trackId}
                    trackId={song.trackId}
                    title={"trackName" in song ? song.trackName : "song.title"}
                    artist={"artistName" in song ? song.artistName : "song.artist"}
                    image={song.artworkUrl100}
                    isVoted={votedSongs.includes(song.trackId)}
                    animating={animatingId === song.trackId}
                    voteCount={"voteCount" in song ? song.voteCount : undefined}
                    disabled={disabledLimit && !votedSongs.includes(song.trackId)}
                    onVote={() =>
                        onVote(
                            song.trackId,
                            "trackName" in song ? song.trackName : "song.title",
                            "artistName" in song ? song.artistName : "song.artist",
                            song.artworkUrl100
                        )
                    }
                />
            ))}
        </ul>
    );
}
