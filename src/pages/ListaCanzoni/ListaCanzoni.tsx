import { useState, useEffect, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { useAdmin } from "../../context/AdminContext";
import SongItem from "../../components/SongItem/SongItem";
import CustomModal from "../../components/CustomModal/CustomModal";
import SearchBar from "../../components/SearchBar/SearchBar";
import "./listaCanzoni.scss";

type Lingua = "italiana" | "spagnola" | "inglese";

type UiSong = {
    trackId: string;
    title: string;
    artist: string;
    cover: string;
    played: boolean;
};

type RecRow = {
    track_id: string;
    language: Lingua;
    order_position: number | null;
    created_at?: string;
    title?: string | null;
    artist?: string | null;
    cover?: string | null;
};

type SpotifyApiTrack = {
    id: string;
    name: string;
    artists?: Array<{ name?: string }>;
    album?: { images?: Array<{ url?: string }> };
};

type SpotifySearchResponse = {
    tracks?: { items?: SpotifyApiTrack[] };
};

const apiBaseUrl = import.meta.env.DEV ? "https://www.karaokeforyou.it" : "";

export default function ListaCanzoni() {
    const [showModal, setShowModal] = useState(false);
    const [filterLang, setFilterLang] = useState<Lingua>("italiana");

    const [dbSongs, setDbSongs] = useState<UiSong[]>([]);
    const [recRows, setRecRows] = useState<RecRow[]>([]);
    const [loading, setLoading] = useState(false);

    const { session } = useAdmin();
    const isAdmin = !!session;

    // Toggle strumenti admin
    const [adminMode, setAdminMode] = useState(false);

    // Search (riuso SearchBar)
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<UiSong[]>([]);
    const [searching, setSearching] = useState(false);
    const searchBarRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const hasVisited = localStorage.getItem("visited-djset");
        if (!hasVisited) {
            setShowModal(true);
            localStorage.setItem("visited-djset", "true");
        }
    }, []);

    // ============ FETCH lista consigliate ============
    async function fetchRecommended(lang: Lingua) {
        setLoading(true);

        // 1) prendo le recommended CON metadati
        const { data: recs, error: recsError } = await supabase
            .from("recommended_songs")
            .select("track_id, language, order_position, created_at, title, artist, cover")
            .eq("language", lang)
            .order("order_position", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: true });

        if (recsError) {
            console.error("Errore fetch recommended_songs:", recsError.message);
            setDbSongs([]);
            setRecRows([]);
            setLoading(false);
            return;
        }

        const rows = (recs ?? []) as RecRow[];
        setRecRows(rows);

        const trackIds = rows.map(r => r.track_id);

        // 2) stato "già cantata" da karaoke_list
        let sungSet = new Set<string>();
        if (trackIds.length > 0) {
            const { data: sungRows, error: sungError } = await supabase
                .from("karaoke_list")
                .select("track_id")
                .in("track_id", trackIds)
                .eq("sung", true);
            if (!sungError) {
                sungSet = new Set((sungRows ?? []).map(r => r.track_id as string));
            }
        }

        // 3) mappo direttamente dai campi di recommended_songs
        const mapped: UiSong[] = rows.map(r => ({
            trackId: r.track_id,
            title: r.title ?? "",
            artist: r.artist ?? "",
            cover: r.cover ?? "",
            played: sungSet.has(r.track_id)
        }));

        setDbSongs(mapped);
        setLoading(false);
    }

    useEffect(() => {
        fetchRecommended(filterLang);
    }, [filterLang]);

    // Animazioni (lista e risultati)
    useEffect(() => {
        const items = Array.from(document.querySelectorAll<HTMLElement>(".song_item"));
        if (!items.length) return;

        const prefersReduced =
            window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    }, [filterLang, dbSongs, results, query]);

    // ============ ADMIN: SEARCH ============
    async function searchSongs(term: string) {
        const trimmed = term.trim();
        if (!trimmed) {
            setResults([]);
            return;
        }

        try {
            setSearching(true);
            const tokenRes = await fetch(`${apiBaseUrl}/api/spotify-token`);
            if (!tokenRes.ok) {
                console.error("Errore token Spotify:", tokenRes.status, tokenRes.statusText);
                setResults([]);
                return;
            }
            const tokenData: { access_token: string } = await tokenRes.json();

            const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
                trimmed
            )}&type=track&limit=25&market=IT`;

            const res = await fetch(url, {
                headers: { Authorization: `Bearer ${tokenData.access_token}` }
            });

            if (!res.ok) {
                console.error("Errore ricerca Spotify:", res.status, res.statusText);
                setResults([]);
                return;
            }

            const data: SpotifySearchResponse = await res.json();
            const items = (data.tracks?.items ?? []).map(
                (t: SpotifyApiTrack): UiSong => ({
                    trackId: t.id,
                    title: t.name,
                    artist: t.artists?.[0]?.name ?? "Sconosciuto",
                    cover: t.album?.images?.[1]?.url ?? "",
                    played: false
                })
            );

            setResults(items);
        } catch (e) {
            console.error("Errore ricerca Spotify:", e);
            setResults([]);
        } finally {
            setSearching(false);
        }
    }

    useEffect(() => {
        const delay = setTimeout(() => {
            if (isAdmin && adminMode && query.trim() !== "") {
                searchSongs(query);
            }
        }, 200);
        return () => clearTimeout(delay);
    }, [query, isAdmin, adminMode]);

    // ============ ADMIN: INSERT ============
    function getMaxOrder() {
        return recRows.reduce((max, r) => Math.max(max, r.order_position ?? 0), 0);
    }

    async function addRecommended(song: UiSong) {
        try {
            // evita duplicati
            const { data: existing } = await supabase
                .from("recommended_songs")
                .select("track_id")
                .eq("track_id", song.trackId)
                .maybeSingle();
            if (existing) {
                console.log("Già presente nei consigli");
                return;
            }

            const nextPos = getMaxOrder() + 1;
            const { error: insertError } = await supabase.from("recommended_songs").insert({
                track_id: song.trackId,
                language: filterLang,
                order_position: nextPos,
                title: song.title,
                artist: song.artist,
                cover: song.cover
            });
            if (insertError) {
                console.error("Errore insert recommended_songs:", insertError.message);
                return;
            }

            setQuery("");
            setResults([]);
            await fetchRecommended(filterLang);
        } catch (e) {
            console.error("Errore in addRecommended:", e);
        }
    }

    // ============ ADMIN: DELETE ============
    async function removeRecommended(trackId: string) {
        const { error } = await supabase.from("recommended_songs").delete().eq("track_id", trackId);
        if (error) {
            console.error("Errore delete recommended_songs:", error.message);
            return;
        }
        await fetchRecommended(filterLang);
    }

    // ============ ADMIN: REORDER ============
    async function ensureOrderPositionsSequential() {
        const needsNormalize =
            recRows.length > 0 &&
            recRows.some(r => r.order_position == null || r.order_position <= 0);

        if (!needsNormalize) return;

        for (let i = 0; i < recRows.length; i++) {
            const r = recRows[i];
            await supabase
                .from("recommended_songs")
                .update({ order_position: i + 1 })
                .eq("track_id", r.track_id);
        }
        await fetchRecommended(filterLang);
    }

    async function move(trackId: string, direction: "up" | "down") {
        if (recRows.length <= 1) return;

        // Se servisse normalizzare (posizioni nulle o <=0), fallo una volta
        await ensureOrderPositionsSequential();

        const index = recRows.findIndex(r => r.track_id === trackId);
        if (index === -1) return;

        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= recRows.length) return;

        const current = recRows[index];
        const target = recRows[targetIndex];

        const aPos = current.order_position ?? index + 1;
        const bPos = target.order_position ?? targetIndex + 1;

        // 1) UI ottimistica: riordino in memoria PRIMA di chiamare il DB
        const newRecRows = [...recRows];
        [newRecRows[index], newRecRows[targetIndex]] = [newRecRows[targetIndex], newRecRows[index]];
        setRecRows(newRecRows);

        setDbSongs(prev => {
            const byId = new Map(prev.map(s => [s.trackId, s]));
            const reordered = newRecRows
                .map(r => byId.get(r.track_id))
                .filter((x): x is UiSong => !!x);
            return reordered;
        });

        // 2) Persistenza: scambia le order_position
        const [{ error: e1 }, { error: e2 }] = await Promise.all([
            supabase
                .from("recommended_songs")
                .update({ order_position: bPos })
                .eq("track_id", current.track_id),
            supabase
                .from("recommended_songs")
                .update({ order_position: aPos })
                .eq("track_id", target.track_id)
        ]);

        // 3) Se qualcosa va storto, riallineo alla verità del server
        if (e1 || e2) {
            console.error("Errore nel riordino:", e1?.message || e2?.message);
            await fetchRecommended(filterLang);
        }
    }

    // ============ RENDER ============
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

                {isAdmin && (
                    <button
                        className="button"
                        onClick={() => setAdminMode(v => !v)}
                        aria-pressed={adminMode}
                    >
                        {adminMode ? "Disattiva EDIT" : "Attiva EDIT"}
                    </button>
                )}
            </div>

            {isAdmin && adminMode && (
                <div className="admin_panel">
                    <SearchBar
                        query={query}
                        setQuery={setQuery}
                        searchSongs={searchSongs}
                        searchBarRef={searchBarRef}
                    />

                    {searching && query.trim() !== "" && (
                        <p className="loader">Cerco su Spotify…</p>
                    )}
                    {!searching && query.trim() !== "" && results.length === 0 && (
                        <p className="loader">Nessun risultato trovato.</p>
                    )}

                    {results.length > 0 && query.trim() !== "" && !searching && (
                        <ul className="song_list">
                            {results.map((song, index) => (
                                <SongItem
                                    key={song.trackId}
                                    index={index}
                                    title={song.title}
                                    artist={song.artist}
                                    cover={song.cover}
                                    isAdmin
                                    onAddRecommended={() => addRecommended(song)}
                                />
                            ))}
                        </ul>
                    )}
                </div>
            )}

            {query.length === 0 &&
                (loading ? (
                    <p className="loader">Caricamento...</p>
                ) : (
                    <ul className="song_list">
                        {dbSongs.map((song, index) => (
                            <SongItem
                                key={song.trackId}
                                index={index}
                                title={song.title}
                                artist={song.artist}
                                cover={song.cover}
                                played={song.played}
                                isAdmin={isAdmin && adminMode}
                                onRemoveRecommended={
                                    isAdmin && adminMode
                                        ? () => removeRecommended(song.trackId)
                                        : undefined
                                }
                                onMoveUp={
                                    isAdmin && adminMode
                                        ? () => move(song.trackId, "up")
                                        : undefined
                                }
                                onMoveDown={
                                    isAdmin && adminMode
                                        ? () => move(song.trackId, "down")
                                        : undefined
                                }
                            />
                        ))}
                    </ul>
                ))}
        </div>
    );
}
