import SongItem from "../../components/SongItem/SongItem";
import songs from "../../data/songs.json";
import "./listaCanzoni.scss";

export default function ListaCanzoni() {
    return (
        <div className="listaCanzoni container">
            <div className="description">
                <h2 className="title">Lista delle canzoni consigliate</h2>
                <p className="paragraph">Non sai cosa cantare?</p>
                <p className="paragraph">Scorri i nostri consigli e scegli la tua hit.</p>
                <p className="paragraph">Quando hai deciso, vieni a prenotarti!</p>
            </div>

            <ul className="song_list">
                {songs.map((song, index) => (
                    <SongItem
                        key={index}
                        index={index}
                        title={song.title}
                        artist={song.singer}
                        cover={song.cover}
                    />
                ))}
            </ul>
        </div>
    );
}
