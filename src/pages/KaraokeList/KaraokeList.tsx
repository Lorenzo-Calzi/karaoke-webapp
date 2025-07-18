import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { showError, showSuccess } from "../../lib/toast";
import "./karaokeList.scss";

type KaraokeEntry = {
    id: string;
    title: string;
    artist: string;
    singer_name: string;
    added_at: string;
    sung: boolean;
};

export default function KaraokeList() {
    const [title, setTitle] = useState("");
    const [artist, setArtist] = useState("");
    const [singerName, setSingerName] = useState("");
    const [karaokeList, setKaraokeList] = useState<KaraokeEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSung, setShowSung] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editArtist, setEditArtist] = useState("");
    const [editSinger, setEditSinger] = useState("");

    const fetchList = async () => {
        const { data, error } = await supabase
            .from("karaoke_list")
            .select("*")
            .order("added_at", { ascending: true });

        if (error) {
            showError("Errore nel caricamento: " + error.message);
        } else {
            setKaraokeList(data || []);
        }
    };

    const addSong = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!title || !singerName) {
            showError("Inserisci almeno titolo e persona che deve cantarla");
            return;
        }

        setLoading(true);
        const { error } = await supabase.from("karaoke_list").insert([
            {
                title,
                artist,
                singer_name: singerName,
                sung: false
            }
        ]);

        if (error) {
            showError("Errore inserimento: " + error.message);
        } else {
            showSuccess("Canzone aggiunta!");
            setTitle("");
            setArtist("");
            setSingerName("");
            fetchList();
        }
        setLoading(false);
    };

    const saveEdit = async (id: string) => {
        const { error } = await supabase
            .from("karaoke_list")
            .update({
                title: editTitle,
                artist: editArtist,
                singer_name: editSinger
            })
            .eq("id", id);

        if (error) {
            showError("Errore aggiornamento: " + error.message);
        } else {
            showSuccess("Canzone aggiornata");
            setEditingId(null);
            fetchList();
        }
    };

    const deleteSong = async (id: string) => {
        const confirm = window.confirm("Sei sicuro di voler eliminare questa canzone?");
        if (!confirm) return;

        const { error } = await supabase.from("karaoke_list").delete().eq("id", id);

        if (error) {
            showError("Errore eliminazione: " + error.message);
        } else {
            showSuccess("Canzone eliminata");
            fetchList();
        }
    };

    const toggleSung = async (id: string, currentValue: boolean) => {
        const { error } = await supabase
            .from("karaoke_list")
            .update({ sung: !currentValue })
            .eq("id", id);

        if (error) {
            showError("Errore aggiornamento: " + error.message);
        } else {
            showSuccess(!currentValue ? "Segnata come cantata" : "Segnata come NON cantata");
            fetchList();
        }
    };

    useEffect(() => {
        fetchList();
    }, []);

    return (
        <div className="karaokeList container">
            <h2 className="title">Lista Karaoke</h2>

            <form onSubmit={addSong} className="karaoke_form">
                <input
                    name="title"
                    autoComplete="off"
                    type="text"
                    placeholder="Titolo*"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    required
                />
                <input
                    name="artist"
                    autoComplete="off"
                    type="text"
                    placeholder="Cantante"
                    value={artist}
                    onChange={e => setArtist(e.target.value)}
                />
                <input
                    name="singer"
                    autoComplete="off"
                    type="text"
                    placeholder="Chi deve cantarla*"
                    value={singerName}
                    onChange={e => setSingerName(e.target.value)}
                    required
                />
                <button type="submit" disabled={loading}>
                    {loading ? "Aggiungendo..." : "Aggiungi"}
                </button>
            </form>

            <label style={{ marginTop: "1rem", display: "block" }}>
                <input
                    type="checkbox"
                    checked={showSung}
                    onChange={() => setShowSung(prev => !prev)}
                />{" "}
                Mostra anche canzoni già cantate
            </label>

            <div className="karaoke_entries">
                {karaokeList
                    .filter(entry => showSung || !entry.sung)
                    .map(entry => (
                        <div key={entry.id} className={`karaoke_item ${entry.sung ? "sung" : ""}`}>
                            {editingId === entry.id ? (
                                <>
                                    <input
                                        value={editTitle}
                                        onChange={e => setEditTitle(e.target.value)}
                                    />
                                    <input
                                        value={editArtist}
                                        onChange={e => setEditArtist(e.target.value)}
                                    />
                                    <input
                                        value={editSinger}
                                        onChange={e => setEditSinger(e.target.value)}
                                    />
                                    <div style={{ marginTop: "0.5rem" }}>
                                        <button onClick={() => saveEdit(entry.id)}>💾</button>
                                        <button
                                            onClick={() => setEditingId(null)}
                                            style={{ marginLeft: "1rem" }}
                                        >
                                            ❌
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="song">
                                        <i className="fa-solid fa-microphone-lines"></i>
                                        <p className="paragraph">
                                            {entry.title} {entry.artist && `(${entry.artist})`}
                                        </p>
                                    </div>
                                    <div className="user">
                                        <i className="fa-regular fa-circle-user"></i>
                                        <p className="paragraph">{entry.singer_name}</p>
                                    </div>

                                    <div className="buttons">
                                        <button
                                            onClick={() => toggleSung(entry.id, entry.sung)}
                                            className="option"
                                            style={{
                                                backgroundColor: "rgba(249, 249, 249, 0.374)"
                                            }}
                                        >
                                            {entry.sung ? (
                                                <i
                                                    className="fa-solid fa-square-check"
                                                    style={{ color: "#0015b5ff", fontSize: "18px" }}
                                                />
                                            ) : (
                                                <i
                                                    className="fa-regular fa-square-check"
                                                    style={{ fontSize: "18px" }}
                                                />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingId(entry.id);
                                                setEditTitle(entry.title);
                                                setEditArtist(entry.artist);
                                                setEditSinger(entry.singer_name);
                                            }}
                                            className="option"
                                            style={{ background: "green" }}
                                        >
                                            <i className="fa-solid fa-pencil"></i>
                                        </button>
                                        <button
                                            onClick={() => deleteSong(entry.id)}
                                            className="option"
                                            style={{ background: "red" }}
                                        >
                                            <i className="fa-solid fa-trash"></i>
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    ))}
            </div>
        </div>
    );
}
