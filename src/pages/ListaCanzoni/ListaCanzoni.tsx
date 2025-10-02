import { useState, useEffect } from "react";
import SongItem from "../../components/SongItem/SongItem";
import songs from "../../data/songs.json";
import CustomModal from "../../components/CustomModal/CustomModal";
import "./listaCanzoni.scss";

type Lingua = "italiana" | "spagnola" | "altra";

export default function ListaCanzoni() {
    const [showModal, setShowModal] = useState(false);
    const [filterLang, setFilterLang] = useState<Lingua>("italiana");

    useEffect(() => {
        const hasVisited = localStorage.getItem("visited-djset");
        if (!hasVisited) {
            setShowModal(true);
            localStorage.setItem("visited-djset", "true");
        }
    }, []);

    const filteredSongs = songs.filter(song => song.lingua === filterLang);

    return (
        <div className="listaCanzoni container">
            <CustomModal
                show={showModal}
                onClose={() => setShowModal(false)}
                description="In questa pagina puoi solo dare un occhiata ai nostri consigli. Per prenotarti passa da noi in console!"
                onPrimaryAction={() => console.log("Modale DJSet confermata")}
                showSecondaryButton={false}
            />

            <div className="description">
                <h2 className="title">Lista delle canzoni consigliate</h2>
                <p className="paragraph">Non sai cosa cantare?</p>
                <p className="paragraph">Scorri i nostri consigli e scegli la tua hit.</p>
                <p className="paragraph">Quando hai deciso, vieni a prenotarti!</p>
            </div>

            <div className="filters">
                <label htmlFor="lingua-filter" className="filter-label">
                    Filtro:
                </label>
                <select
                    id="lingua-filter"
                    aria-label="Filtro"
                    value={filterLang}
                    onChange={e => setFilterLang(e.target.value as Lingua)}
                    className="filter-select"
                >
                    <option value="italiana">Italiane</option>
                    <option value="spagnola">Spagnole</option>
                    <option value="inglese">Inglesi</option>
                </select>
            </div>

            <ul className="song_list">
                {filteredSongs.map((song, index) => (
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
