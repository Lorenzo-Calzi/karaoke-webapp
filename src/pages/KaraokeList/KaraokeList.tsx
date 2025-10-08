import { useEffect, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";
import { showError, showSuccess } from "../../lib/toast";
import CustomModal from "../../components/CustomModal/CustomModal";
import { DragDropContext, Droppable, type DropResult } from "@hello-pangea/dnd";
import KaraokeItem from "../../components/KaraokeItem/KaraokeItem";
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

/* ---------------- Spotify types + helpers (dedupe) ---------------- */
type SpotifyApiTrack = {
    id: string;
    name: string;
    popularity?: number;
    artists?: Array<{ name?: string }>;
    album?: {
        images?: Array<{ url?: string }>;
        album_type?: "album" | "single" | "compilation";
        release_date?: string;
    };
};
type SpotifySearchResponse = { tracks?: { items?: SpotifyApiTrack[] } };
type UiSong = { trackId: string; title: string; artist: string; cover: string };

const apiBaseUrl = import.meta.env.DEV ? "https://www.karaokeforyou.it" : "";

const BAD_WORDS = [
    "remaster",
    "remastered",
    "live",
    "acoustic",
    "karaoke",
    "instrumental",
    "radio edit",
    "sped up",
    "slowed",
    "remix",
    "version",
    "edit"
];

const norm = (s: string) =>
    s
        .toLowerCase()
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/\s*\([^)]*\)\s*/g, " ")
        .replace(/\s*-\s*[^-]+$/g, " ")
        .replace(/[^\p{L}\p{N} ]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();

const hasBadWord = (s: string) => BAD_WORDS.some(w => s.toLowerCase().includes(w));

const scoreTrack = (t: SpotifyApiTrack) => {
    let s = 0;
    if (t.popularity != null) s += t.popularity / 100; // 0..1
    if (t.album?.album_type === "single") s += 0.2; // preferisci single
    if (hasBadWord(t.name)) s -= 0.7; // penalizza remix/live/etc. più forte
    return s;
};

function collapseTracks(items: SpotifyApiTrack[]): UiSong[] {
    const best = new Map<string, SpotifyApiTrack>(); // key = artist|title (normalizzati)
    for (const t of items) {
        const artist = t.artists?.[0]?.name ?? "";
        const key = `${norm(artist)}|${norm(t.name)}`;
        const prev = best.get(key);
        if (!prev || scoreTrack(t) > scoreTrack(prev)) best.set(key, t);
    }
    const out: UiSong[] = [];
    for (const t of best.values()) {
        const imgs = t.album?.images ?? [];
        const cover = imgs[2]?.url ?? imgs[1]?.url ?? imgs[0]?.url ?? ""; // prendi la più piccola disponibile
        out.push({
            trackId: t.id,
            title: t.name,
            artist: t.artists?.[0]?.name ?? "Sconosciuto",
            cover
        });
    }
    return out;
}

/* --------------------------- focus helper --------------------------- */
function focusNoScroll(el: HTMLElement | null | undefined) {
    if (!el) return;
    const x = window.scrollX;
    const y = window.scrollY;
    try {
        (el as HTMLElement).focus({ preventScroll: true });
    } catch {
        el.focus();
    }
    // ripristina la posizione in ogni caso (fallback per browser che ignorano preventScroll)
    requestAnimationFrame(() => {
        window.scrollTo(x, y);
        // doppio rAF utile su iOS per contrastare lo “snap” della tastiera
        requestAnimationFrame(() => window.scrollTo(x, y));
    });
}

/* ---------------------------------- Pagina ---------------------------------- */
export default function KaraokeList() {
    // form (aggiunta)
    const [title, setTitle] = useState("");
    const [singerName, setSingerName] = useState("");
    const [trackId, setTrackId] = useState<string | null>(null);

    const titleRef = useRef<HTMLInputElement>(null);
    const singerRef = useRef<HTMLInputElement>(null);
    const [errors, setErrors] = useState<{ title?: string; singer?: string; track?: string }>({});

    // lista
    const [karaokeList, setKaraokeList] = useState<KaraokeEntry[]>([]);
    const [loading, setLoading] = useState(false);
    const [showSung, setShowSung] = useState(false);

    // edit inline
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editTitle, setEditTitle] = useState("");
    const [editSinger, setEditSinger] = useState("");
    const editingEntryRef = useRef<KaraokeEntry | null>(null);
    const editTitleRef = useRef<HTMLInputElement>(null);
    const editSingerRef = useRef<HTMLInputElement>(null);
    const [editTrackId, setEditTrackId] = useState<string | null>(null);

    // modale delete
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [songToDelete, setSongToDelete] = useState<string | null>(null);

    // DnD guards
    const [isDragging, setIsDragging] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);

    // ricerca Spotify (aggiunta)
    const [searching, setSearching] = useState(false);
    const [results, setResults] = useState<UiSong[]>([]);
    const [showResults, setShowResults] = useState(false);
    const skipNextSearch = useRef(false);

    // ricerca Spotify (EDIT)
    const [editSearching, setEditSearching] = useState(false);
    const [editResults, setEditResults] = useState<UiSong[]>([]);
    const [editShowResults, setEditShowResults] = useState(false);
    const skipNextSearchEdit = useRef(false);

    const fetchList = async () => {
        const { data, error } = await supabase
            .from("karaoke_list")
            .select("*")
            .order("order_position", { ascending: true, nullsFirst: false })
            .order("added_at", { ascending: true });

        if (error) showError("Errore nel caricamento: " + error.message);
        else setKaraokeList(data || []);
    };

    /* ----------- Ricerca Spotify (AGGIUNTA) con dedupe ----------- */
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
            )}&type=track&limit=25&market=IT`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } });
            if (!res.ok) {
                setResults([]);
                setShowResults(false);
                return;
            }

            const data: SpotifySearchResponse = await res.json();
            const collapsed = collapseTracks(data.tracks?.items ?? []);
            setResults(collapsed);
            setShowResults(true);
        } finally {
            setSearching(false);
        }
    }

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

    /* ----------- Ricerca Spotify (EDIT) con dedupe ----------- */
    async function searchSongsEdit(q: string) {
        const query = q.trim();
        if (!query) {
            setEditResults([]);
            setEditShowResults(false);
            return;
        }
        try {
            setEditSearching(true);
            const tokenRes = await fetch(`${apiBaseUrl}/api/spotify-token`);
            if (!tokenRes.ok) {
                setEditResults([]);
                setEditShowResults(false);
                return;
            }
            const { access_token }: { access_token: string } = await tokenRes.json();

            const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
                query
            )}&type=track&limit=25&market=IT`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } });
            if (!res.ok) {
                setEditResults([]);
                setEditShowResults(false);
                return;
            }

            const data: SpotifySearchResponse = await res.json();
            const collapsed = collapseTracks(data.tracks?.items ?? []);
            setEditResults(collapsed);
            setEditShowResults(true);
        } finally {
            setEditSearching(false);
        }
    }

    useEffect(() => {
        if (editingId === null) return;
        const id = setTimeout(() => {
            if (skipNextSearchEdit.current) {
                skipNextSearchEdit.current = false;
                return;
            }
            const q = editTitle.trim();
            if (q.length >= 2) searchSongsEdit(q);
            else {
                setEditResults([]);
                setEditShowResults(false);
            }
        }, 220);
        return () => clearTimeout(id);
    }, [editTitle, editingId]);

    useEffect(() => {
        function onDocClick(e: MouseEvent) {
            if (!editTitleRef.current) return;
            const parent = editTitleRef.current.parentElement;
            if (e.target instanceof Node && parent?.contains(e.target)) return;
            setEditShowResults(false);
        }
        if (editShowResults) document.addEventListener("click", onDocClick);
        return () => document.removeEventListener("click", onDocClick);
    }, [editShowResults]);

    /* -------------------------- CRUD -------------------------- */
    const addSong = async (e: React.FormEvent) => {
        e.preventDefault();

        const errs: { title?: string; singer?: string; track?: string } = {};
        if (!title.trim()) errs.title = "Inserisci un titolo";
        if (!singerName.trim()) errs.singer = "Inserisci chi deve cantarla";
        if (!trackId) errs.track = "Seleziona una canzone dai risultati";

        setErrors(errs);
        if (errs.title) {
            focusNoScroll(titleRef.current);
            return;
        }
        if (errs.singer) {
            focusNoScroll(singerRef.current);
            return;
        }

        setLoading(true);
        const maxPosition = Math.max(...karaokeList.map(i => i.order_position || 0), 0);

        const { error } = await supabase.from("karaoke_list").insert([
            {
                title: title.trim(),
                singer_name: singerName.trim(),
                track_id: trackId, // collegamento certo alla traccia scelta
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

    const handleEdit = (entry: KaraokeEntry) => {
        setEditingId(entry.id);
        editingEntryRef.current = entry;
        setEditTitle(entry.title);
        setEditSinger(entry.singer_name);
        setEditTrackId(entry.track_id ?? null);
        setEditResults([]);
        setEditShowResults(false);
        setTimeout(() => editTitleRef.current?.focus(), 0); // qui ok se scrolla perché è la stessa posizione
    };

    const saveEdit = async (id: string) => {
        const newTrackId = editTrackId ?? editingEntryRef.current?.track_id ?? null;
        const payload: Partial<KaraokeEntry> = {
            title: editTitle,
            singer_name: editSinger,
            track_id: newTrackId
        };

        const { error } = await supabase.from("karaoke_list").update(payload).eq("id", id);
        if (error) showError("Errore aggiornamento: " + error.message);
        else {
            showSuccess("Canzone aggiornata");
            setEditingId(null);
            editingEntryRef.current = null;
            fetchList();
        }
    };

    const handleEditChange = (field: "title" | "singer", value: string) => {
        if (field === "title") {
            setEditTitle(value);
            setEditShowResults(false); // riapre dopo debounce
        } else {
            setEditSinger(value);
        }
    };

    const onPickEditResult = (item: UiSong) => {
        skipNextSearchEdit.current = true;
        setEditTitle(item.title);
        setEditTrackId(item.trackId); // collega la riga alla nuova canzone
        setEditShowResults(false);
        focusNoScroll(editSingerRef.current); // ✅ focus senza scroll
    };

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

    // polling soft (se lo usi; altrimenti puoi rimuoverlo)
    useEffect(() => {
        fetchList();
        const interval = setInterval(() => {
            if (!isDragging && !isSavingOrder && editingId === null) fetchList();
        }, 5000);
        return () => clearInterval(interval);
    }, [isDragging, isSavingOrder, editingId]);

    return (
        <div className="karaokeList container">
            {/* Modale delete */}
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

            {/* --- FORM AGGIUNTA --- */}
            <form onSubmit={addSong} className="karaoke_form">
                {/* Titolo con risultati Spotify */}
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
                            setShowResults(false); // riapre solo dopo il debounce
                        }}
                        className={errors.title || errors.track ? "input_error" : ""}
                        ref={titleRef}
                        onKeyDown={e => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                focusNoScroll(singerRef.current); // ✅ focus senza scroll
                            }
                        }}
                    />
                    {errors.title && <p className="error_message">{errors.title}</p>}
                    {errors.track && <p className="error_message">{errors.track}</p>}

                    {showResults && (results.length > 0 || searching) && (
                        <div
                            style={{
                                background: "rgba(0,0,0,0.3)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: 5,
                                marginTop: "0.75rem",
                                maxHeight: 320,
                                overflowY: "auto",
                                padding: "0 0.7rem"
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
                                            focusNoScroll(singerRef.current); // ✅ focus senza scroll
                                        }}
                                        style={{
                                            width: "100%",
                                            margin: "0.7rem 0",
                                            padding: 0,
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
                                                width={40}
                                                height={40}
                                                style={{
                                                    borderRadius: 4,
                                                    objectFit: "cover",
                                                    flex: "0 0 auto"
                                                }}
                                            />
                                        )}
                                        {/* Testi monoriga con ellissi */}
                                        <div
                                            style={{
                                                display: "flex",
                                                flexDirection: "column",
                                                minWidth: 0
                                            }}
                                        >
                                            <span
                                                style={{
                                                    lineHeight: 1.2,
                                                    fontWeight: 600,
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    maxWidth: "100%"
                                                }}
                                                title={item.title}
                                            >
                                                {item.title}
                                            </span>
                                            <span
                                                style={{
                                                    opacity: 0.85,
                                                    fontSize: 13,
                                                    whiteSpace: "nowrap",
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    maxWidth: "100%"
                                                }}
                                                title={item.artist}
                                            >
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

            {/* --- FILTRO --- */}
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

            {/* --- LISTA --- */}
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
                                            // refs
                                            editTitleRef={editTitleRef}
                                            editSingerRef={editSingerRef}
                                            // dropdown edit solo sulla riga in editing
                                            editShowResults={
                                                editingId === entry.id ? editShowResults : false
                                            }
                                            editResults={editingId === entry.id ? editResults : []}
                                            editSearching={
                                                editingId === entry.id ? editSearching : false
                                            }
                                            onPickEditResult={onPickEditResult}
                                        />
                                    ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>

            {/* Modale delete (duplicata qui per avere overlay sopra la lista) */}
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
        </div>
    );
}
