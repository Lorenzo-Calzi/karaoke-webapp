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

    useEffect(() => {
        const items = Array.from(document.querySelectorAll<HTMLElement>(".song_item"));
        if (!items.length) return;

        const prefersReduced =
            window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        // reset: togli "inview" quando cambi filtro
        items.forEach(el => el.classList.remove("inview"));

        if (prefersReduced) {
            items.forEach(el => el.classList.add("inview"));
            return;
        }

        const io = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("inview");
                        io.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.15 }
        );

        items.forEach(el => io.observe(el));
        return () => io.disconnect();
    }, [filterLang]);

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
                <label htmlFor="lingua-filter" className="filter-label sr-only">
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
