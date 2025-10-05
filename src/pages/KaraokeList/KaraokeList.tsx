import { useEffect, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";
import { showError, showSuccess } from "../../lib/toast";
import CustomModal from "../../components/CustomModal/CustomModal";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import "./karaokeList.scss";

type KaraokeEntry = {
    id: string;
    title: string;
    singer_name: string;
    added_at: string;
    sung: boolean;
    order_position?: number;
    track_id?: string | null;
};

// ---- Spotify types ----
type SpotifyApiTrack = {
    id: string;
    name: string;
    artists?: Array<{ name?: string }>;
    album?: { images?: Array<{ url?: string }> };
};
type SpotifySearchResponse = {
    tracks?: { items?: SpotifyApiTrack[] };
};
type UiSong = { trackId: string; title: string; artist: string; cover: string };

const apiBaseUrl = import.meta.env.DEV ? "https://www.karaokeforyou.it" : "";

/* ------------------------- Item della lista (Draggable) ------------------------- */
function KaraokeItem({
    entry,
    index,
    editingId,
    editTitle,
    editSinger,
    onEdit,
    onSaveEdit,
    onCancelEdit,
    onToggleSung,
    onDelete,
    onEditChange
}: {
    entry: KaraokeEntry;
    index: number;
    editingId: string | null;
    editTitle: string;
    editSinger: string;
    onEdit: (entry: KaraokeEntry) => void;
    onSaveEdit: (id: string) => void;
    onCancelEdit: () => void;
    onToggleSung: (id: string, currentValue: boolean) => void;
    onDelete: (id: string) => void;
    onEditChange: (field: "title" | "singer", value: string) => void;
}) {
    return (
        <Draggable draggableId={entry.id} index={index}>
            {(provided, snapshot) => (
                <div
                    className={`karaoke_item ${entry.sung ? "sung" : ""} ${
                        snapshot.isDragging ? "dragging" : ""
                    }`}
                    data-id={entry.id}
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                >
                    {editingId === entry.id ? (
                        <div className="edit_form">
                            <input
                                value={editTitle}
                                placeholder="Titolo*"
                                onChange={e => onEditChange("title", e.target.value)}
                                autoFocus
                                onFocus={e => e.currentTarget.select()}
                            />
                            <input
                                value={editSinger}
                                placeholder="Chi deve cantarla*"
                                onChange={e => onEditChange("singer", e.target.value)}
                            />
                            <div className="buttons">
                                <button
                                    onClick={() => onSaveEdit(entry.id)}
                                    className="option"
                                    style={{ backgroundColor: "rgba(85, 255, 0, 0.4)" }}
                                >
                                    <i className="fa-solid fa-check"></i>
                                </button>
                                <button
                                    onClick={onCancelEdit}
                                    className="option"
                                    style={{ backgroundColor: "rgba(255, 0, 0, 0.4)" }}
                                >
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="content">
                                <div className="song">
                                    <p className="paragraph">{entry.title}</p>
                                </div>
                                <div className="user">
                                    <p className="paragraph">{entry.singer_name}</p>
                                </div>

                                <div className="buttons">
                                    <button
                                        onClick={() => onToggleSung(entry.id, entry.sung)}
                                        className="option"
                                        style={{ backgroundColor: "rgba(249, 249, 249, 0.4)" }}
                                    >
                                        <i
                                            className={`${
                                                entry.sung ? "fa-solid" : "fa-regular"
                                            } fa-square-check`}
                                            style={{
                                                color: entry.sung ? "#7CFC00" : "white",
                                                fontSize: "18px"
                                            }}
                                        />
                                    </button>
                                    <button
                                        onClick={() => onEdit(entry)}
                                        className="option"
                                        style={{ background: "rgba(0, 123, 255, 0.4)" }}
                                    >
                                        <i className="fa-solid fa-pencil"></i>
                                    </button>
                                    <button
                                        onClick={() => onDelete(entry.id)}
                                        className="option"
                                        style={{ backgroundColor: "rgba(255, 0, 0, 0.4)" }}
                                    >
                                        <i className="fa-solid fa-trash"></i>
                                    </button>
                                </div>
                            </div>

                            <div
                                className="drag-handle sortable-handle"
                                {...provided.dragHandleProps}
                            >
                                <i className="fa-solid fa-grip-vertical"></i>
                            </div>
                        </>
                    )}
                </div>
            )}
        </Draggable>
    );
}

/* ---------------------------------- Pagina ---------------------------------- */
export default function KaraokeList() {
    // form state
    const [title, setTitle] = useState("");
    const [singerName, setSingerName] = useState("");
    const [trackId, setTrackId] = useState<string | null>(null);

    const titleRef = useRef<HTMLInputElement>(null);
    const singerRef = useRef<HTMLInputElement>(null);
    const errorsRef = useRef<{ title?: string; singer?: string; track?: string }>({});
    const [errors, setErrors] = useState<{ title?: string; singer?: string; track?: string }>({});

    // lista
    const [karaokeList, setKaraokeList] = useState<KaraokeEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSung, setShowSung] = useState(false);

    // edit inline
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editSinger, setEditSinger] = useState("");

    // modale delete
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [songToDelete, setSongToDelete] = useState<string | null>(null);

    // DnD guards
    const [isDragging, setIsDragging] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    // ricerca Spotify
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<UiSong[]>([]);
    const [showResults, setShowResults] = useState(false);
    const skipNextSearch = useRef(false);

    const fetchList = async () => {
        const { data, error } = await supabase
            .from("karaoke_list")
            .select("*")
            .order("order_position", { ascending: true, nullsFirst: false })
            .order("added_at", { ascending: true });

        if (error) showError("Errore nel caricamento: " + error.message);
        else setKaraokeList(data || []);
    };

    // ricerca Spotify sul titolo (debounced)
    async function searchSongs(q: string) {
        const query = q.trim();
        if (!query) {
            setResults([]);
            setShowResults(false);
            setTrackId(null);
            return;
        }

        try {
            setSearching(true);
            const tokenRes = await fetch(`${apiBaseUrl}/api/spotify-token`);
            if (!tokenRes.ok) {
                setResults([]);
                setShowResults(false);
                return;
            }
            const { access_token }: { access_token: string } = await tokenRes.json();

            const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
                query
            )}&type=track&limit=12&market=IT`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } });
            if (!res.ok) {
                setResults([]);
                setShowResults(false);
                return;
            }

            const data: SpotifySearchResponse = await res.json();
            const items = (data.tracks?.items ?? []).map(
                (t): UiSong => ({
                    trackId: t.id,
                    title: t.name,
                    artist: t.artists?.[0]?.name ?? "Sconosciuto",
                    cover: t.album?.images?.[2]?.url ?? ""
                })
            );
            setResults(items);
            setShowResults(true);
        } finally {
            setSearching(false);
        }
    }

    // debounce su "title" + skip dopo selezione
    useEffect(() => {
        const id = setTimeout(() => {
            if (skipNextSearch.current) {
                skipNextSearch.current = false;
                return;
            }
            const q = title.trim();
            if (q.length >= 2) searchSongs(q);
            else {
                setResults([]);
                setShowResults(false);
                setTrackId(null);
            }
        }, 220);
        return () => clearTimeout(id);
    }, [title]);

    // chiudi dropdown clic esterno
    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!titleRef.current) return;
            const parent = titleRef.current.parentElement;
            if (e.target instanceof Node && parent?.contains(e.target)) return;
            setShowResults(false);
        }
        if (showResults) document.addEventListener("click", onDocClick);
        return () => document.removeEventListener("click", onDocClick);
    }, [showResults]);

    // submit
    const addSong = async (e: React.FormEvent) => {
        e.preventDefault();

        const errs: { title?: string; singer?: string; track?: string } = {};
        if (!title.trim()) errs.title = "Inserisci un titolo";
        if (!singerName.trim()) errs.singer = "Inserisci chi deve cantarla";
        if (!trackId) errs.track = "Seleziona una canzone dai risultati";

        errorsRef.current = errs;
        setErrors(errs);
        if (errs.title) {
            titleRef.current?.focus();
            return;
        }
        if (errs.singer) {
            singerRef.current?.focus();
            return;
        }

        setLoading(true);

        const maxPosition = Math.max(...karaokeList.map(i => i.order_position || 0), 0);

        const { error } = await supabase.from("karaoke_list").insert([
            {
                title: title.trim(),
                singer_name: singerName.trim(),
                track_id: trackId, // 🔑 salviamo sempre il collegamento
                sung: false,
                order_position: maxPosition + 1
            }
        ]);

        if (error) showError("Errore inserimento: " + error.message);
        else {
            showSuccess("Canzone aggiunta!");
            setTitle("");
            setSingerName("");
            setTrackId(null);
            setResults([]);
            setShowResults(false);
            fetchList();
            titleRef.current?.blur();
            singerRef.current?.blur();
        }

        setLoading(false);
    };

    // edit
    const saveEdit = async (id: string) => {
        const { error } = await supabase
            .from("karaoke_list")
            .update({ title: editTitle, singer_name: editSinger })
            .eq("id", id);

        if (error) showError("Errore aggiornamento: " + error.message);
        else {
            showSuccess("Canzone aggiornata");
            setEditingId(null);
            fetchList();
        }
    };

    const handleEdit = (entry: KaraokeEntry) => {
        setEditingId(entry.id);
        setEditTitle(entry.title);
        setEditSinger(entry.singer_name);
    };

    const handleEditChange = (field: "title" | "singer", value: string) => {
        if (field === "title") setEditTitle(value);
        if (field === "singer") setEditSinger(value);
    };

    // delete
    const confirmDeleteSong = (id: string) => {
        setSongToDelete(id);
        setShowDeleteModal(true);
    };
    const handleDeleteConfirmed = async () => {
        if (!songToDelete) return;
        const { error } = await supabase.from("karaoke_list").delete().eq("id", songToDelete);
        if (error) showError("Errore eliminazione: " + error.message);
        else {
            showSuccess("Canzone eliminata");
            fetchList();
        }
        setShowDeleteModal(false);
        setSongToDelete(null);
    };

    // toggle sung
    const toggleSung = async (id: string, currentValue: boolean) => {
        const { error } = await supabase
            .from("karaoke_list")
            .update({ sung: !currentValue })
            .eq("id", id);
        if (error) showError("Errore aggiornamento: " + error.message);
        else {
            showSuccess(!currentValue ? "Segnata come cantata" : "Segnata come NON cantata");
            fetchList();
        }
    };

    // DnD reorder (come tua logica esistente)
    const handleDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        setIsSavingOrder(true);

        // split
        const visible = karaokeList.filter(e => showSung || !e.sung);
        const hidden = karaokeList.filter(e => !(showSung || !e.sung));

        // reorder solo sul visibile
        const [moved] = visible.splice(result.source.index, 1);
        visible.splice(result.destination.index, 0, moved);

        // ricompone + reindex globale
        const combined = [...visible, ...hidden];
        const reordered = combined.map((item, idx) => ({ ...item, order_position: idx + 1 }));

        setKaraokeList(reordered); // UI ottimistica

        // persisti solo i cambiati
        const changed = reordered.filter(item => {
            const prev = karaokeList.find(k => k.id === item.id);
            return prev && prev.order_position !== item.order_position;
        });

        if (changed.length) {
            await Promise.all(
                changed.map(item =>
                    supabase
                        .from("karaoke_list")
                        .update({ order_position: item.order_position })
                        .eq("id", item.id)
                )
            );
        }

        showSuccess("Ordine aggiornato!");
        setIsSavingOrder(false);
        setTimeout(fetchList, 400);
    };

    // polling soft
    useEffect(() => {
        fetchList();
        const interval = setInterval(() => {
            if (!isDragging && !isSavingOrder && editingId === null) fetchList();
        }, 5000);
        return () => clearInterval(interval);
    }, [isDragging, isSavingOrder, editingId]);

    return (
        <div className="karaokeList container">
            <CustomModal
                show={showDeleteModal}
                onClose={() => {
                    setShowDeleteModal(false);
                    setSongToDelete(null);
                }}
                title="Conferma eliminazione"
                description="Sei sicuro di voler eliminare questa canzone dalla lista?"
                onPrimaryAction={handleDeleteConfirmed}
                showSecondaryButton={true}
                timer={false}
            />

            <h2 className="title">Lista Karaoke</h2>

            <form onSubmit={addSong} className="karaoke_form">
                {/* Titolo con risultati Spotify (menu inline per non toccare SCSS) */}
                <div className="form_group" style={{ position: "relative" }}>
                    <input
                        name="title"
                        autoComplete="off"
                        type="text"
                        placeholder="Titolo*"
                        value={title}
                        onChange={e => {
                            setTitle(e.target.value);
                            setTrackId(null); // se ritocchi, invalidi la selezione
                            setShowResults(false); // riapre solo dopo debounce
                        }}
                        className={errors.title || errors.track ? "input_error" : ""}
                        ref={titleRef}
                        onKeyDown={e => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                singerRef.current?.focus();
                            }
                        }}
                    />
                    {errors.title && <p className="error_message">{errors.title}</p>}
                    {errors.track && <p className="error_message">{errors.track}</p>}

                    {showResults && (results.length > 0 || searching) && (
                        <div
                            style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                top: "100%",
                                zIndex: 50,
                                background: "rgba(0,0,0,0.9)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: 8,
                                marginTop: 6,
                                maxHeight: 320,
                                overflowY: "auto",
                                boxShadow: "0 8px 28px rgba(0,0,0,.35)"
                            }}
                        >
                            {searching && (
                                <div style={{ padding: 12, fontSize: 14 }}>Cerco su Spotify…</div>
                            )}
                            {!searching &&
                                results.map(item => (
                                    <button
                                        type="button"
                                        key={item.trackId}
                                        onClick={() => {
                                            skipNextSearch.current = true; // evita riapertura immediata
                                            setTitle(item.title);
                                            setTrackId(item.trackId); // NON compiliamo singer_name: lo scrivi tu
                                            setShowResults(false);
                                            titleRef.current?.blur();
                                            singerRef.current?.focus();
                                        }}
                                        style={{
                                            width: "100%",
                                            padding: "10px 12px",
                                            display: "flex",
                                            gap: 10,
                                            alignItems: "center",
                                            textAlign: "left",
                                            background: "transparent",
                                            color: "inherit",
                                            border: "none",
                                            cursor: "pointer"
                                        }}
                                    >
                                        {item.cover && (
                                            <img
                                                src={item.cover}
                                                alt=""
                                                width={36}
                                                height={36}
                                                style={{ borderRadius: 4, objectFit: "cover" }}
                                            />
                                        )}
                                        <div style={{ display: "flex", flexDirection: "column" }}>
                                            <span style={{ fontWeight: 600, lineHeight: 1.2 }}>
                                                {item.title}
                                            </span>
                                            <span style={{ opacity: 0.8, fontSize: 13 }}>
                                                {item.artist}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                        </div>
                    )}
                </div>

                <div className="form_group">
                    <input
                        name="singer"
                        autoComplete="off"
                        type="text"
                        placeholder="Chi deve cantarla*"
                        value={singerName}
                        onChange={e => setSingerName(e.target.value)}
                        className={errors.singer ? "input_error" : ""}
                        ref={singerRef}
                    />
                    {errors.singer && <p className="error_message">{errors.singer}</p>}
                </div>

                <button type="submit" disabled={loading}>
                    <p className="paragraph" style={{ fontWeight: 600 }}>
                        {loading ? "Aggiungendo..." : "Aggiungi"}
                    </p>
                </button>
            </form>

            {karaokeList.some(song => song.sung) && (
                <label className="already_sung_label">
                    <input
                        type="checkbox"
                        checked={showSung}
                        onChange={() => setShowSung(prev => !prev)}
                    />
                    <p className="paragraph">
                        {showSung
                            ? "Nascondi le canzoni già cantate"
                            : "Mostra anche le canzoni già cantate"}
                    </p>
                </label>
            )}

            <div className="karaoke_entries">
                <DragDropContext
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={result => {
                        setIsDragging(false);
                        handleDragEnd(result);
                    }}
                >
                    <Droppable droppableId="karaoke-list">
                        {provided => (
                            <div
                                className="karaoke_entries"
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                            >
                                {karaokeList
                                    .filter(entry => showSung || !entry.sung)
                                    .map((entry, index) => (
                                        <KaraokeItem
                                            key={entry.id}
                                            entry={entry}
                                            index={index}
                                            editingId={editingId}
                                            editTitle={editTitle}
                                            editSinger={editSinger}
                                            onEdit={handleEdit}
                                            onSaveEdit={saveEdit}
                                            onCancelEdit={() => setEditingId(null)}
                                            onToggleSung={toggleSung}
                                            onDelete={confirmDeleteSong}
                                            onEditChange={handleEditChange}
                                        />
                                    ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>
        </div>
    );
}
