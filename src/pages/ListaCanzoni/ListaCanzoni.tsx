import { useState, useEffect } from "react";
import SongItem from "../../components/SongItem/SongItem";
import songs from "../../data/songs.json";
import CustomModal from "../../components/CustomModal/CustomModal";
import "./listaCanzoni.scss";

export default function ListaCanzoni() {
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        const hasVisited = localStorage.getItem("visited-djset");
        if (!hasVisited) {
            setShowModal(true);
            localStorage.setItem("visited-djset", "true");
        }
    }, []);

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
