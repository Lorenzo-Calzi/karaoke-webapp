import { useEffect, useState, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { useAdmin } from "../../context/AdminContext";
import { useVoting } from "../../context/VotingContext";
import VotoProgressivo from "../../components/VotoProgressivo/VotoProgressivo";
import Tabs from "../../components/Tabs/Tabs";
import SearchBar from "../../components/SearchBar/SearchBar";
import SongItem from "../../components/SongItem/SongItem";
import CustomModal from "../../components/CustomModal/CustomModal";
import CountdownToEvent from "../../components/CountdownToEvent/CountdownToEvent";
import { showInfo, showError } from "../../lib/toast";
import "./consigliaUnaCanzone.scss";

type SpotifySong = {
    trackId: string;
    trackName: string;
    artistName: string;
    artworkUrl100: string;
    popularity: number;
    played?: boolean;
};

type SpotifyApiTrack = {
    id: string;
    name: string;
    popularity?: number;
    artists?: Array<{ name?: string }>;
    album?: { images?: Array<{ url?: string }> };
};

type SpotifySearchResponse = {
    tracks: { items: SpotifyApiTrack[] };
};

const apiBaseUrl = import.meta.env.DEV ? "https://www.karaokeforyou.it" : "";

export default function ConsigliaUnaCanzone() {
    const { session } = useAdmin();
    const isAdmin = !!session;
    const [voterId] = useState(() => {
        const stored = localStorage.getItem("voter_id");
        if (stored) return stored;
        const newId = crypto.randomUUID();
        localStorage.setItem("voter_id", newId);
        return newId;
    });
    const currentVoterId = session ? "ADMIN" : voterId;

    const { votingAllowed } = useVoting();
    const [activeTab, setActiveTab] = useState<"search" | "ranking">("search");
    const [query, setQuery] = useState<string>("");
    const [results, setResults] = useState<SpotifySong[]>([]);
    const [votedSongs, setVotedSongs] = useState<string[]>([]);

    const [votedSongsDetails, setVotedSongsDetails] = useState<SpotifySong[]>([]);
    const [loadingVotedSongs, setLoadingVotedSongs] = useState(true);
    const [topSongs, setTopSongs] = useState<
        {
            trackId: string;
            title: string;
            artist: string;
            artworkUrl100: string;
            voteCount: number;
            played: boolean;
            iVoted: boolean;
            firstVoteAt: string;
        }[]
    >([]);
    const [animatingId, setAnimatingId] = useState<string | null>(null);
    const searchBarRef = useRef<HTMLInputElement>(null);
    const [showModal, setShowModal] = useState(false);

    // ==== ANIMAZIONI: IntersectionObserver persistente ====
    const ioRef = useRef<IntersectionObserver | null>(null);
    // contestoLista cambia quando cambia ciò che stai mostrando (per resettare le animazioni iniziali)
    const listContext = (() => {
        if (activeTab === "ranking") return "ranking";
        // tab "search": se query vuota mostri i votedSongsDetails, altrimenti results
        return query.trim() === "" ? "search-voted" : "search-results";
    })();

    const normalizeText = (text: string) =>
        text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f']/g, "");

    const searchSongs = async (searchTerm: string): Promise<void> => {
        if (!navigator.onLine) {
            console.warn("Sei offline. Salto ricerca canzoni.");
            setResults([]);
            return;
        }

        const trimmed = searchTerm.trim();
        if (!trimmed) {
            setResults([]);
            return;
        }

        try {
            const tokenRes = await fetch(`${apiBaseUrl}/api/spotify-token`);
            const tokenData: { access_token: string } = await tokenRes.json();
            const access_token = tokenData.access_token;

            const res = await fetch(
                `https://api.spotify.com/v1/search?q=${encodeURIComponent(
                    trimmed
                )}&type=track&limit=50`,
                {
                    headers: {
                        Authorization: `Bearer ${access_token}`
                    }
                }
            );

            const data: SpotifySearchResponse = await res.json();

            const loweredWords = normalizeText(trimmed).split(/\s+/);

            const rawTracks: SpotifySong[] = data.tracks.items.map((item: SpotifyApiTrack) => ({
                trackId: item.id,
                trackName: item.name,
                artistName: item.artists?.[0]?.name || "Sconosciuto",
                artworkUrl100: item.album?.images?.[1]?.url || "",
                popularity: item.popularity ?? 0
            }));

            const filtered = rawTracks.filter(track => {
                const title = normalizeText(track.trackName);
                const artist = normalizeText(track.artistName);
                const isRelevant = loweredWords.every(
                    word => title.includes(word) || artist.includes(word)
                );
                const isValid =
                    track.trackId && track.trackName && track.artistName && track.artworkUrl100;
                return isRelevant && isValid;
            });

            const uniqueMap = new Map<string, SpotifySong>();
            filtered.forEach(track => {
                const key = `${normalizeText(track.trackName)}|${normalizeText(track.artistName)}`;
                if (!uniqueMap.has(key)) uniqueMap.set(key, track);
            });

            const sorted = Array.from(uniqueMap.values()).sort(
                (a, b) => b.popularity - a.popularity
            );

            // 🧠 Recupera lo stato "played" da Supabase
            const trackIds = sorted.map(song => song.trackId);
            const { data: songsPlayedData } = await supabase
                .from("songs")
                .select("trackId, played")
                .in("trackId", trackIds);

            const playedMap = new Map(songsPlayedData?.map(s => [s.trackId, s.played]));

            // 🔁 Enrich dei risultati con .played
            const enriched = sorted.map(song => ({
                ...song,
                played: playedMap.get(song.trackId) ?? false
            }));

            setResults(enriched);
        } catch (error) {
            console.error("Errore durante la ricerca:", error);
        }
    };

    const handleVote = async (
        trackId: string,
        title: string,
        artist: string,
        artworkUrl100: string
    ) => {
        if (!navigator.onLine) {
            showInfo("Sei offline. Non puoi votare in questo momento.");
            return;
        }

        const alreadyVoted = votedSongsDetails.some(s => s.trackId === trackId);
        if (!alreadyVoted && votedSongsDetails.length >= 3) return;

        setAnimatingId(trackId);
        setTimeout(() => setAnimatingId(null), 400);

        // 🛡️ Controllo: è già stata suonata?
        const { data: songs, error: songError } = await supabase
            .from("songs")
            .select("played")
            .eq("trackId", trackId);

        if (songError) {
            console.error("Errore nel controllo played:", songError.message);
            showError("Errore nel verificare lo stato della canzone.");
            return;
        }

        const songData = songs?.[0];

        if (songData?.played) {
            showInfo("Questa canzone è già stata suonata.");
            await fetchTopSongs();
            return;
        }

        if (alreadyVoted) {
            setVotedSongs(prev => prev.filter(id => id !== trackId));
            setTopSongs(prev =>
                prev.map(song =>
                    song.trackId === trackId
                        ? { ...song, voteCount: song.voteCount - 1, iVoted: false }
                        : song
                )
            );

            const { error } = await supabase
                .from("votes")
                .delete()
                .eq("trackId", trackId)
                .eq("voterId", currentVoterId);

            if (!error) {
                await fetchVotedSongsDetails();
                setTimeout(() => fetchTopSongs(), 400);
            }
        } else {
            const { error } = await supabase.from("votes").insert([
                {
                    trackId,
                    title,
                    artist,
                    artworkUrl100,
                    voterId: currentVoterId
                }
            ]);

            if (!error) {
                // Assicura che la canzone sia presente in songs
                const { error: upsertError } = await supabase
                    .from("songs")
                    .upsert([{ trackId, title, artist, artworkUrl100 }]);

                if (upsertError) {
                    console.error("Errore upsert songs:", upsertError.message);
                }

                setVotedSongs(prev => [...prev, trackId]);

                setTopSongs(prev => {
                    const songIndex = prev.findIndex(s => s.trackId === trackId);
                    if (songIndex !== -1) {
                        const updated = [...prev];
                        updated[songIndex] = {
                            ...updated[songIndex],
                            voteCount: updated[songIndex].voteCount + 1,
                            iVoted: true
                        };
                        return updated;
                    } else {
                        return [
                            ...prev,
                            {
                                trackId,
                                title,
                                artist,
                                artworkUrl100,
                                voteCount: 1,
                                played: false,
                                iVoted: true,
                                firstVoteAt: new Date().toISOString()
                            }
                        ];
                    }
                });

                await fetchVotedSongsDetails();
                fetchTopSongs();
                setTimeout(() => setQuery(""), 400);
            }
        }
    };

    const fetchTopSongs = async () => {
        // 1. Recupera tutti i voti
        const { data: votesData, error: votesError } = await supabase
            .from("votes")
            .select("trackId, title, artist, artworkUrl100, created_at, voterId");

        if (votesError || !votesData) {
            console.error("Errore nel recupero classifica:", votesError?.message);
            return;
        }

        // 2. Aggrega voti per canzone
        const voteMap = new Map<
            string,
            { title: string; artist: string; artworkUrl100: string; count: number }
        >();

        const firstVoteTimeMap = new Map<string, string>();

        for (const row of votesData) {
            const trackId = row.trackId;

            if (!voteMap.has(trackId)) {
                voteMap.set(trackId, {
                    title: row.title,
                    artist: row.artist,
                    artworkUrl100: row.artworkUrl100,
                    count: 1
                });
                firstVoteTimeMap.set(trackId, row.created_at);
            } else {
                voteMap.get(trackId)!.count += 1;

                const existing = firstVoteTimeMap.get(trackId);
                if (existing && row.created_at < existing) {
                    firstVoteTimeMap.set(trackId, row.created_at);
                }
            }
        }

        // 3. Assicura che tutte le canzoni siano in `songs`
        const missingSongs = Array.from(voteMap.entries()).map(([trackId, info]) => ({
            trackId,
            title: info.title,
            artist: info.artist,
            artworkUrl100: info.artworkUrl100
        }));

        const { error: upsertError } = await supabase.from("songs").upsert(missingSongs);
        if (upsertError) {
            console.error("Errore nel fare upsert in songs:", upsertError.message);
        }

        // 4. Recupera stato played
        const { data: songsData, error: songsError } = await supabase
            .from("songs")
            .select("trackId, played");

        if (songsError) {
            console.error("Errore nel recupero songs:", songsError.message);
        }

        const playedMap = new Map(songsData?.map(s => [s.trackId, s.played]));

        // 5. Crea lista completa con `iVoted` e `firstVoteAt`
        const topList = Array.from(voteMap.entries())
            .map(([trackId, info]) => ({
                trackId,
                title: info.title,
                artist: info.artist,
                artworkUrl100: info.artworkUrl100,
                voteCount: info.count,
                played: playedMap.get(trackId) ?? false,
                iVoted: votesData.some(v => v.trackId === trackId && v.voterId === currentVoterId),

                firstVoteAt: firstVoteTimeMap.get(trackId) ?? ""
            }))
            .sort((a, b) => {
                if (a.played !== b.played) return a.played ? 1 : -1;
                if (!a.played && a.iVoted !== b.iVoted) return a.iVoted ? -1 : 1;
                if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
                return b.firstVoteAt.localeCompare(a.firstVoteAt); // più recente prima
            });

        setTopSongs(topList);
    };

    const fetchVotedSongsDetails = async () => {
        if (!navigator.onLine) {
            console.warn("Sei offline. Salto recupero dettagli canzoni votate.");
            setLoadingVotedSongs(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from("votes")
                .select("trackId, title, artist, artworkUrl100")
                .eq("voterId", currentVoterId);

            if (error) {
                console.error("Errore nel recuperare dettagli:", error.message);
                setVotedSongsDetails([]);
                return;
            }

            if (!data || data.length === 0) {
                setVotedSongsDetails([]);
                return;
            }

            // ✅ recupera anche lo stato `played`
            const trackIds = data.map(song => song.trackId);

            const { data: songsPlayedData } = await supabase
                .from("songs")
                .select("trackId, played")
                .in("trackId", trackIds);

            const playedMap = new Map(songsPlayedData?.map(s => [s.trackId, s.played]));

            const unique = new Map<string, SpotifySong>();
            for (const song of data) {
                const trackId = String(song.trackId);
                if (
                    trackId &&
                    song.title &&
                    song.artist &&
                    song.artworkUrl100 &&
                    !unique.has(trackId)
                ) {
                    unique.set(trackId, {
                        trackId,
                        trackName: song.title,
                        artistName: song.artist,
                        artworkUrl100: song.artworkUrl100,
                        popularity: 0,
                        played: playedMap.get(trackId) ?? false
                    });
                }
            }

            setVotedSongsDetails(Array.from(unique.values()));
        } catch (e) {
            console.error("Errore nel recuperare dettagli:", e);
            setVotedSongsDetails([]);
        } finally {
            setLoadingVotedSongs(false);
        }
    };

    const filteredRankingResults = topSongs.filter(song => {
        const normalizedQuery = normalizeText(query);
        const normalizedTitle = normalizeText(song.title);
        const normalizedArtist = normalizeText(song.artist);
        return (
            normalizedQuery !== "" &&
            (normalizedTitle.includes(normalizedQuery) ||
                normalizedArtist.includes(normalizedQuery))
        );
    });

    async function togglePlayed(trackId: string, played: boolean) {
        const { error } = await supabase.from("songs").update({ played }).eq("trackId", trackId);

        if (!error) {
            fetchTopSongs(); // aggiorna classifica
            fetchVotedSongsDetails(); // aggiorna i voti utente

            if (query.trim()) {
                searchSongs(query); // aggiorna risultati di ricerca
            }
        } else {
            console.error("Errore aggiornamento played:", error.message);
        }
    }

    useEffect(() => {
        // fetchTopSongs iniziale
        if (!currentVoterId) return;
        fetchTopSongs();

        // intervallo ogni 10 secondi
        const interval = setInterval(() => {
            fetchTopSongs();
        }, 10000);

        const visited = localStorage.getItem("visited-consiglia");
        if (!visited) {
            setShowModal(true);
            localStorage.setItem("visited-consiglia", "true");
        }

        // listener rete
        const handleOffline = () => {
            showInfo("Sei offline. Alcune funzionalità non saranno disponibili.");
        };

        const handleOnline = () => {
            showInfo("Connessione ripristinata!");
        };

        window.addEventListener("offline", handleOffline);
        window.addEventListener("online", handleOnline);

        return () => {
            clearInterval(interval);
            window.removeEventListener("offline", handleOffline);
            window.removeEventListener("online", handleOnline);
        };
    }, [currentVoterId]);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            if (activeTab === "search") {
                searchSongs(query);
            }
        }, 200);
        return () => clearTimeout(delayDebounce);
    }, [query, activeTab]);

    useEffect(() => {
        const fetchVotesFromDB = async () => {
            if (!currentVoterId) return;
            if (!navigator.onLine) return;

            const { data, error } = await supabase
                .from("votes")
                .select("trackId")
                .eq("voterId", currentVoterId);

            if (!error && data) {
                const ids = data.map(row => row.trackId);
                setVotedSongs(ids);
            }
        };

        fetchVotesFromDB();
    }, [currentVoterId]);

    useEffect(() => {
        if (currentVoterId) {
            fetchVotedSongsDetails();
        }
    }, [votedSongs, currentVoterId]);

    // ==== Effetto esistente di fade_in / fade_out (lasciato invariato) ====
    useEffect(() => {
        const checkVisibility = () => {
            const searchBarBottom = searchBarRef.current?.getBoundingClientRect().bottom || 0;
            const items = document.querySelectorAll(".song_item");

            items.forEach(item => {
                const itemTop = item.getBoundingClientRect().top;
                const el = item as HTMLElement;

                if (itemTop < searchBarBottom) {
                    el.classList.remove("fade_in");
                    el.classList.add("fade_out");
                } else {
                    if (el.classList.contains("fade_out")) {
                        el.classList.remove("fade_out");
                        el.classList.add("fade_in");
                    }
                }
            });
        };

        window.addEventListener("scroll", checkVisibility);
        window.addEventListener("resize", checkVisibility);

        return () => {
            window.removeEventListener("scroll", checkVisibility);
            window.removeEventListener("resize", checkVisibility);
        };
    }, [results, query, activeTab]);

    // ==== NUOVE ANIMAZIONI: gestione .inview per evitare opacity:0 ====

    // (A) Setup/Reset animazioni quando cambia il contesto della lista (tab o tipo lista)
    useEffect(() => {
        // chiudi e resetta un eventuale observer precedente
        if (ioRef.current) {
            ioRef.current.disconnect();
            ioRef.current = null;
        }

        const items = Array.from(document.querySelectorAll<HTMLElement>(".song_item"));

        // reset animazione: togli .inview (così la animazione iniziale può rieseguire)
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
    }, [listContext]); // cambia quando: tab cambia oppure query passa da "" a non-vuota (e viceversa)

    // (B) Quando arrivano/si aggiornano i dati, attacca l’observer ai nodi NON ancora inview
    useEffect(() => {
        const io = ioRef.current;
        if (!io) return;

        const fresh = document.querySelectorAll<HTMLElement>(".song_item:not(.inview)");
        fresh.forEach(el => io.observe(el));
    }, [results.length, votedSongsDetails.length, topSongs.length]);

    // if (!isReady) return <Loader />;

    return (
        <div className="consigliaUnaCanzone container">
            <CustomModal
                show={showModal}
                onClose={() => setShowModal(false)}
                description="In questa pagina puoi solo votare le canzoni che vuoi che il DJ metta durante la serata. Hai a disposizione fino a 3 voti!"
                onPrimaryAction={() => console.log("Modale voti confermata")}
                showSecondaryButton={false}
            />

            <div className="description">
                <h2 className="title">
                    {votingAllowed || isAdmin
                        ? "Partecipa alla festa"
                        : "La festa non è ancora iniziata"}
                </h2>
                <p className="paragraph">
                    {votingAllowed || isAdmin
                        ? "Vota le canzoni che vuoi ballare! (max 3)"
                        : "Le votazioni non sono attive"}
                </p>
                <p className="paragraph">
                    {votingAllowed || isAdmin
                        ? "Il DJ metterà le più richieste"
                        : "Torna più tardi durante la serata!"}
                </p>
            </div>

            {votingAllowed || isAdmin ? (
                <>
                    <VotoProgressivo valore={votedSongsDetails.length} />

                    <Tabs
                        activeTab={activeTab}
                        onTabChange={t => {
                            setActiveTab(t);
                            setQuery("");
                        }}
                    />

                    <SearchBar
                        query={query}
                        setQuery={setQuery}
                        searchSongs={searchSongs}
                        searchBarRef={searchBarRef}
                    />

                    {activeTab === "search" && (
                        <>
                            {loadingVotedSongs && (
                                <p className="loader">Controllo disponibilità votazioni...</p>
                            )}
                            {!loadingVotedSongs &&
                                votedSongsDetails.length === 0 &&
                                query === "" && (
                                    <p className="loader">Non hai ancora votato nessuna canzone</p>
                                )}

                            {votedSongsDetails.length > 0 && !loadingVotedSongs && query === "" && (
                                <ul className="song_list">
                                    {votedSongsDetails.map((song, index) => (
                                        <SongItem
                                            key={index}
                                            index={index}
                                            title={song.trackName}
                                            artist={song.artistName}
                                            cover={song.artworkUrl100}
                                            voted={votedSongsDetails.some(
                                                s => s.trackId === song.trackId
                                            )}
                                            animating={animatingId === song.trackId}
                                            onVote={() =>
                                                handleVote(
                                                    song.trackId,
                                                    song.trackName,
                                                    song.artistName,
                                                    song.artworkUrl100
                                                )
                                            }
                                            disabled={
                                                !votedSongsDetails.some(
                                                    s => s.trackId === song.trackId
                                                ) && votedSongsDetails.length >= 3
                                            }
                                            played={song.played}
                                        />
                                    ))}
                                </ul>
                            )}

                            {results.length > 0 && query !== "" && (
                                <ul className="song_list">
                                    {results.map((song, index) => (
                                        <SongItem
                                            key={index}
                                            index={index}
                                            title={song.trackName}
                                            artist={song.artistName}
                                            cover={song.artworkUrl100}
                                            voted={votedSongsDetails.some(
                                                s => s.trackId === song.trackId
                                            )}
                                            animating={animatingId === song.trackId}
                                            onVote={() =>
                                                handleVote(
                                                    song.trackId,
                                                    song.trackName,
                                                    song.artistName,
                                                    song.artworkUrl100
                                                )
                                            }
                                            disabled={
                                                !votedSongsDetails.some(
                                                    s => s.trackId === song.trackId
                                                ) && votedSongsDetails.length >= 3
                                            }
                                            played={song.played}
                                        />
                                    ))}
                                </ul>
                            )}
                        </>
                    )}

                    {activeTab === "ranking" &&
                        (topSongs.length > 0 ? (
                            <ul className="song_list">
                                {(query ? filteredRankingResults : topSongs).map((song, index) => (
                                    <SongItem
                                        key={index}
                                        index={index}
                                        title={song.title}
                                        artist={song.artist}
                                        cover={song.artworkUrl100}
                                        voted={song.iVoted}
                                        animating={animatingId === song.trackId}
                                        voteCount={song.voteCount}
                                        onVote={() =>
                                            handleVote(
                                                song.trackId,
                                                song.title,
                                                song.artist,
                                                song.artworkUrl100
                                            )
                                        }
                                        disabled={!song.iVoted && votedSongsDetails.length >= 3}
                                        isAdmin={isAdmin}
                                        played={song.played}
                                        onTogglePlayed={() =>
                                            togglePlayed(song.trackId, !song.played)
                                        }
                                    />
                                ))}
                            </ul>
                        ) : (
                            <p>Ancora nessuna canzone in classifica</p>
                        ))}
                </>
            ) : (
                <CountdownToEvent />
            )}
        </div>
    );
}
