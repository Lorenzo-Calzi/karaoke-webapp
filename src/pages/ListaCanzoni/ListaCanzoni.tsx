import { useState, useEffect, useRef, useMemo } from "react";
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
    queued?: boolean;
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
    popularity?: number;
    artists?: Array<{ name?: string }>;
    album?: { images?: Array<{ url?: string }>; album_type?: "album" | "single" | "compilation" };
};

type SpotifySearchResponse = {
    tracks?: { items?: SpotifyApiTrack[] };
};

const apiBaseUrl = import.meta.env.DEV ? "https://www.karaokeforyou.it" : "";

/* ---------------- Deduplica stile KaraokeList (con fix remix) ---------------- */
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

// controlla i “bad words” sul titolo grezzo (minuscolo), non normalizzato
const hasBadWord = (s: string) => {
    const low = s.toLowerCase();
    return BAD_WORDS.some(w => low.includes(w));
};

const scoreTrack = (t: SpotifyApiTrack) => {
    let s = 0;
    if (t.popularity != null) s += t.popularity / 100; // 0..1
    if (t.album?.album_type === "single") s += 0.2; // preferisci single
    if (hasBadWord(t.name)) s -= 0.7; // penalizza remix/live/etc.
    return s;
};

function collapseRaw(items: SpotifyApiTrack[]): SpotifyApiTrack[] {
    const best = new Map<string, SpotifyApiTrack>(); // key: artist|title normalizzati
    for (const t of items) {
        const artist = t.artists?.[0]?.name ?? "";
        const key = `${norm(artist)}|${norm(t.name)}`;
        const prev = best.get(key);
        if (!prev || scoreTrack(t) > scoreTrack(prev)) best.set(key, t);
    }
    return Array.from(best.values());
}

export default function ListaCanzoni() {
    const [showModal, setShowModal] = useState(false);
    const [filterLang, setFilterLang] = useState<Lingua>("italiana");

    const [dbSongs, setDbSongs] = useState<UiSong[]>([]);
    const [recRows, setRecRows] = useState<RecRow[]>([]);
    const [loading, setLoading] = useState(false);

    const { session } = useAdmin();
    const isAdmin = !!session;
    const isSuperadmin = session?.isSuperadmin;

    // Admin toggle
    const [adminMode, setAdminMode] = useState(false);

    // Search admin
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<UiSong[]>([]);
    const [searching, setSearching] = useState(false);
    const searchBarRef = useRef<HTMLInputElement>(null);

    // refs per polling/scroll/animazioni
    const listRef = useRef<HTMLUListElement | null>(null);
    const isFetchingRef = useRef(false);
    const pollIdRef = useRef<number | null>(null);

    // IntersectionObserver persistente
    const ioRef = useRef<IntersectionObserver | null>(null);
    // versione lista: incrementa quando i dati “sostanziali” cambiano
    const [listVersion, setListVersion] = useState(0);

    // set per filtraggio duplicati in ricerca
    const existingRecommendedSet = useMemo(() => new Set(recRows.map(r => r.track_id)), [recRows]);
    const existingPairsSet = useMemo(() => {
        const set = new Set<string>();
        for (const r of recRows) {
            const title = r.title ?? "";
            const artist = r.artist ?? "";
            set.add(`${norm(artist)}|${norm(title)}`);
        }
        return set;
    }, [recRows]);

    useEffect(() => {
        const hasVisited = localStorage.getItem("visited-djset");
        if (!hasVisited) {
            setShowModal(true);
            localStorage.setItem("visited-djset", "true");
        }
    }, []);

    // ========= FETCH consigliate (+ cantata/prenotata) =========
    const lastSignature = useRef<string>("");

    async function fetchRecommended(
        lang: Lingua,
        { patchOnly = false }: { patchOnly?: boolean } = {}
    ) {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        if (!patchOnly) setLoading(true);

        const { data: recs, error: recsError } = await supabase
            .from("recommended_songs")
            .select("track_id, language, order_position, created_at, title, artist, cover")
            .eq("language", lang)
            .order("order_position", { ascending: true, nullsFirst: false })
            .order("created_at", { ascending: true });

        if (recsError) {
            console.error("Errore fetch recommended_songs:", recsError.message);
            if (!patchOnly) {
                setDbSongs([]);
                setRecRows([]);
                setLoading(false);
            }
            isFetchingRef.current = false;
            return;
        }

        const rows = (recs ?? []) as RecRow[];
        const trackIds = rows.map(r => r.track_id);

        // stati cantata/prenotata
        let sungSet = new Set<string>();
        let queuedSet = new Set<string>();
        if (trackIds.length > 0) {
            const [{ data: sungRows }, { data: queuedRows }] = await Promise.all([
                supabase
                    .from("karaoke_list")
                    .select("track_id")
                    .in("track_id", trackIds)
                    .eq("sung", true),
                supabase
                    .from("karaoke_list")
                    .select("track_id")
                    .in("track_id", trackIds)
                    .eq("sung", false)
            ]);
            if (sungRows)
                sungSet = new Set((sungRows as { track_id: string }[]).map(r => r.track_id));
            if (queuedRows)
                queuedSet = new Set((queuedRows as { track_id: string }[]).map(r => r.track_id));
        }

        // firma compatta per capire se è cambiato qualcosa di visibile
        const signature = rows
            .map(r => {
                const played = sungSet.has(r.track_id) ? 1 : 0;
                const queued = queuedSet.has(r.track_id) ? 1 : 0;
                return `${r.track_id}:${r.order_position ?? 0}:${played}:${queued}:${
                    r.title ?? ""
                }:${r.artist ?? ""}:${r.cover ?? ""}`;
            })
            .join("|");

        const changed = signature !== lastSignature.current;
        if (!changed) {
            if (!patchOnly) setLoading(false);
            isFetchingRef.current = false;
            return; // niente update → niente animazione né scroll-jump
        }
        lastSignature.current = signature;

        setRecRows(rows);
        setDbSongs(prev => {
            const prevMap = new Map(prev.map(s => [s.trackId, s]));
            let anyChanged = false;
            const next: UiSong[] = rows.map(r => {
                const played = sungSet.has(r.track_id);
                const queued = !played && queuedSet.has(r.track_id);
                const p = prevMap.get(r.track_id);
                const same =
                    p &&
                    p.title === (r.title ?? "") &&
                    p.artist === (r.artist ?? "") &&
                    p.cover === (r.cover ?? "") &&
                    p.played === played &&
                    (p.queued ?? false) === queued;

                if (same) return p!;
                anyChanged = true;
                return {
                    trackId: r.track_id,
                    title: r.title ?? "",
                    artist: r.artist ?? "",
                    cover: r.cover ?? "",
                    played,
                    queued
                };
            });

            if (!anyChanged && prev.length === next.length) return prev;
            return next;
        });

        // bump versione lista → (ri)osserva gli item non ancora inview
        setListVersion(v => v + 1);

        if (!patchOnly) setLoading(false);
        isFetchingRef.current = false;
    }

    // primo caricamento
    useEffect(() => {
        lastSignature.current = ""; // reset firma quando cambi lingua
        fetchRecommended(filterLang, { patchOnly: false });
    }, [filterLang]);

    // ========= Polling “morbido” (no scroll jump, no flicker) =========
    useEffect(() => {
        const shouldPause = isAdmin && adminMode && query.trim() !== "";
        if (shouldPause) return;

        const tick = async () => {
            if (document.hidden) return;
            const el = listRef.current;
            const scrollTop = el ? el.scrollTop : null;

            await fetchRecommended(filterLang, { patchOnly: true });

            if (el && scrollTop != null) {
                requestAnimationFrame(() => {
                    el.scrollTop = scrollTop;
                });
            }
        };

        tick();
        pollIdRef.current = window.setInterval(tick, 5000);

        const onVisible = () => !document.hidden && tick();
        document.addEventListener("visibilitychange", onVisible);

        return () => {
            if (pollIdRef.current) window.clearInterval(pollIdRef.current);
            document.removeEventListener("visibilitychange", onVisible);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filterLang, isAdmin, adminMode, query]);

    /* ================== ANIMAZIONI con IntersectionObserver ================== */

    // (A) Setup observer + reset animazioni al cambio lingua (animazione iniziale)
    useEffect(() => {
        // cleanup eventuale observer precedente
        if (ioRef.current) {
            ioRef.current.disconnect();
            ioRef.current = null;
        }

        const items = Array.from(document.querySelectorAll<HTMLElement>(".song_item"));
        // reset: togli "inview" per rigiocare l'animazione al cambio lingua
        items.forEach(el => el.classList.remove("inview"));

        const prefersReduced =
            window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (prefersReduced) {
            items.forEach(el => el.classList.add("inview"));
            return;
        }

        const io = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("inview");
                        io.unobserve(entry.target as Element);
                    }
                });
            },
            { threshold: 0.15 }
        );
        ioRef.current = io;

        // osserva tutti gli item attuali
        items.forEach(el => io.observe(el));

        return () => {
            io.disconnect();
            ioRef.current = null;
        };
    }, [filterLang]);

    // (B) Ogni volta che la lista cambia “sostanzialmente” (listVersion), attacca l’observer ai nodi non ancora inview
    useEffect(() => {
        const io = ioRef.current;
        if (!io) return;

        const fresh = document.querySelectorAll<HTMLElement>(".song_item:not(.inview)");
        fresh.forEach(el => io.observe(el));
    }, [listVersion, results.length]);

    // ========= SEARCH admin (dedupe + filtra già presenti) =========
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
                setResults([]);
                return;
            }
            const { access_token } = await tokenRes.json();

            const url = `https://api.spotify.com/v1/search?q=${encodeURIComponent(
                trimmed
            )}&type=track&limit=25&market=IT`;

            const res = await fetch(url, { headers: { Authorization: `Bearer ${access_token}` } });
            if (!res.ok) {
                setResults([]);
                return;
            }

            const data: SpotifySearchResponse = await res.json();

            const collapsed = collapseRaw(data.tracks?.items ?? []);
            const filtered = collapsed.filter(t => {
                const key = `${norm(t.artists?.[0]?.name ?? "")}|${norm(t.name)}`;
                return !existingRecommendedSet.has(t.id) && !existingPairsSet.has(key);
            });

            setResults(
                filtered.map(t => ({
                    trackId: t.id,
                    title: t.name,
                    artist: t.artists?.[0]?.name ?? "Sconosciuto",
                    cover: t.album?.images?.[1]?.url ?? t.album?.images?.[0]?.url ?? "",
                    played: false
                }))
            );
        } finally {
            setSearching(false);
        }
    }

    useEffect(() => {
        const delay = setTimeout(() => {
            if (isAdmin && adminMode && query.trim() !== "") {
                searchSongs(query);
            }
        }, 220);
        return () => clearTimeout(delay);
    }, [query, isAdmin, adminMode, existingRecommendedSet, existingPairsSet]);

    // ========= INSERT / DELETE / REORDER (uguali) =========
    function getMaxOrder() {
        return recRows.reduce((max, r) => Math.max(max, r.order_position ?? 0), 0);
    }

    async function addRecommended(song: UiSong) {
        try {
            const { data: existing } = await supabase
                .from("recommended_songs")
                .select("track_id")
                .eq("track_id", song.trackId)
                .maybeSingle();
            if (existing) return;

            const nextPos = getMaxOrder() + 1;
            const { error } = await supabase.from("recommended_songs").insert({
                track_id: song.trackId,
                language: filterLang,
                order_position: nextPos,
                title: song.title,
                artist: song.artist,
                cover: song.cover
            });
            if (error) return;
            setQuery("");
            setResults([]);
            await fetchRecommended(filterLang, { patchOnly: false });
        } catch {
            console.log("");
        }
    }

    async function removeRecommended(trackId: string) {
        const { error } = await supabase.from("recommended_songs").delete().eq("track_id", trackId);
        if (!error) await fetchRecommended(filterLang, { patchOnly: false });
    }

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
        await fetchRecommended(filterLang, { patchOnly: false });
    }

    async function move(trackId: string, direction: "up" | "down") {
        if (recRows.length <= 1) return;
        await ensureOrderPositionsSequential();

        const index = recRows.findIndex(r => r.track_id === trackId);
        if (index === -1) return;

        const targetIndex = direction === "up" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= recRows.length) return;

        const current = recRows[index];
        const target = recRows[targetIndex];

        const aPos = current.order_position ?? index + 1;
        const bPos = target.order_position ?? targetIndex + 1;

        // UI ottimistica
        const newRecRows = [...recRows];
        [newRecRows[index], newRecRows[targetIndex]] = [newRecRows[targetIndex], newRecRows[index]];
        setRecRows(newRecRows);

        setDbSongs(prev => {
            const byId = new Map(prev.map(s => [s.trackId, s]));
            const reordered = newRecRows
                .map(r => byId.get(r.track_id))
                .filter((x): x is UiSong => !!x);
            return reordered.length ? reordered : prev;
        });

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
        if (e1 || e2) await fetchRecommended(filterLang, { patchOnly: false });
    }

    // ========= RENDER =========
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

                {isSuperadmin && (
                    <button
                        className="button"
                        onClick={() => setAdminMode(v => !v)}
                        aria-pressed={adminMode}
                    >
                        {adminMode ? "Disattiva EDIT" : "Attiva EDIT"}
                    </button>
                )}
            </div>

            {isSuperadmin && adminMode && (
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
                        <p className="loader">
                            Nessun risultato disponibile (già in lista o non trovato).
                        </p>
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
                    <ul className="song_list" ref={listRef}>
                        {dbSongs.map((song, index) => (
                            <SongItem
                                key={song.trackId}
                                index={index}
                                title={song.title}
                                artist={song.artist}
                                cover={song.cover}
                                played={song.played}
                                queued={song.queued}
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
