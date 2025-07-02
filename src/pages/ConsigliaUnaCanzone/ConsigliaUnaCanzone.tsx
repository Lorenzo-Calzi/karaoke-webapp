import { useEffect, useState, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { useVoting } from "../../structure/VotingContext";
import VotoProgressivo from "../../components/VotoProgressivo/VotoProgressivo";
import Tabs from "../../components/Tabs/Tabs";
import SearchBar from "../../components/SearchBar/SearchBar";
import SongItem from "../../components/SongItem/SongItem";
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

const apiBaseUrl = import.meta.env.DEV ? "https://karaoke-webapp.vercel.app" : "";

export default function ConsigliaUnaCanzone() {
    const { votingAllowed, isAdmin } = useVoting();
    const [activeTab, setActiveTab] = useState<"search" | "ranking">("search");
    const [query, setQuery] = useState<string>("");
    const [results, setResults] = useState<SpotifySong[]>([]);
    const [votedSongs, setVotedSongs] = useState<string[]>([]);
    const [voterId] = useState(() => {
        const stored = localStorage.getItem("voter_id");
        if (stored) return stored;

        const newId = crypto.randomUUID();
        localStorage.setItem("voter_id", newId);
        return newId;
    });
    const [votedSongsDetails, setVotedSongsDetails] = useState<SpotifySong[]>([]);
    const [loadingVotedSongs, setLoadingVotedSongs] = useState(true);
    const [topSongs, setTopSongs] = useState<
        {
            trackId: string;
            title: string;
            artist: string;
            artworkUrl100: string;
            voteCount: number;
            played?: boolean;
        }[]
    >([]);
    const [animatingId, setAnimatingId] = useState<string | null>(null);
    const searchBarRef = useRef<HTMLInputElement>(null);

    const normalizeText = (text: string) =>
        text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f']/g, "");

    const searchSongs = async (searchTerm: string): Promise<void> => {
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

            const data = await res.json();

            const loweredWords = normalizeText(trimmed).split(/\s+/);

            const rawTracks: SpotifySong[] = data.tracks.items.map((item: any) => ({
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
        const alreadyVoted = votedSongs.includes(trackId);
        if (!alreadyVoted && votedSongs.length >= 3) return;

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
                    song.trackId === trackId ? { ...song, voteCount: song.voteCount - 1 } : song
                )
            );

            const { error } = await supabase
                .from("votes")
                .delete()
                .eq("trackId", trackId)
                .eq("voterId", voterId);

            if (!error) {
                await fetchVotedSongsDetails();
                setTimeout(() => fetchTopSongs(), 400);
            }
        } else {
            const { error } = await supabase
                .from("votes")
                .insert([{ trackId, title, artist, artworkUrl100, voterId }]);

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
                            voteCount: updated[songIndex].voteCount + 1
                        };
                        return updated;
                    } else {
                        return [
                            ...prev,
                            { trackId, title, artist, artworkUrl100, voteCount: 1, played: false }
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
        // Step 1: prendi i voti
        const { data: votesData, error: votesError } = await supabase
            .from("votes")
            .select("trackId, title, artist, artworkUrl100");

        if (votesError || !votesData) {
            console.error("Errore nel recupero classifica:", votesError?.message);
            return;
        }

        // Step 2: aggrega i voti per canzone
        const voteMap = new Map<
            string,
            { title: string; artist: string; artworkUrl100: string; count: number }
        >();

        for (const row of votesData) {
            const trackId = row.trackId;
            if (!voteMap.has(trackId)) {
                voteMap.set(trackId, {
                    title: row.title,
                    artist: row.artist,
                    artworkUrl100: row.artworkUrl100,
                    count: 1
                });
            } else {
                voteMap.get(trackId)!.count += 1;
            }
        }

        // Step 3: assicurati che tutte le canzoni siano presenti in `songs`
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

        // Step 4: recupera stato `played` dalla tabella songs
        const { data: songsData, error: songsError } = await supabase
            .from("songs")
            .select("trackId, played");

        if (songsError) {
            console.error("Errore nel recupero songs:", songsError.message);
        }

        const playedMap = new Map(songsData?.map(s => [s.trackId, s.played]));

        // Step 5: unisci tutto
        const topList = Array.from(voteMap.entries())
            .map(([trackId, info]) => ({
                trackId,
                title: info.title,
                artist: info.artist,
                artworkUrl100: info.artworkUrl100,
                voteCount: info.count,
                played: playedMap.get(trackId) ?? false
            }))
            .sort((a, b) => b.voteCount - a.voteCount);

        setTopSongs(topList);
    };

    const fetchVotedSongsDetails = async () => {
        if (votedSongs.length === 0) {
            setVotedSongsDetails([]);
            setLoadingVotedSongs(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from("votes")
                .select("trackId, title, artist, artworkUrl100")
                .eq("voterId", voterId);

            if (error) {
                console.error("Errore nel recuperare dettagli:", error.message);
                setLoadingVotedSongs(false);
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
                        played: playedMap.get(trackId) ?? false // ✅ qui
                    });
                }
            }

            setVotedSongsDetails(Array.from(unique.values()));
        } catch (e) {
            console.error("Errore nel recuperare dettagli:", e);
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
        fetchTopSongs();

        const interval = setInterval(() => {
            fetchTopSongs(); // ogni 10 secondi
        }, 10000);

        return () => clearInterval(interval);
    }, []);

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
            const { data, error } = await supabase
                .from("votes")
                .select("trackId")
                .eq("voterId", voterId);
            if (error) {
                console.error("Errore nel recupero voti:", error.message);
            } else if (data) {
                const ids = data.map(row => row.trackId);
                setVotedSongs(ids);
            }
        };
        fetchVotesFromDB();
    }, [voterId]);

    useEffect(() => {
        fetchVotedSongsDetails();
    }, [votedSongs]);

    // useEffect(() => {
    //     const checkVisibility = () => {
    //         const searchBarBottom = searchBarRef.current?.getBoundingClientRect().bottom || 0;
    //         const items = document.querySelectorAll(".song_item");

    //         items.forEach(item => {
    //             const itemTop = item.getBoundingClientRect().top;
    //             const el = item as HTMLElement;

    //             el.style.opacity = "1";
    //             el.style.animation = "normal";

    //             if (itemTop < searchBarBottom) {
    //                 el.classList.remove("fade-in");
    //                 el.classList.add("invisible");
    //             } else {
    //                 if (el.classList.contains("invisible")) {
    //                     el.classList.remove("invisible");
    //                     el.classList.add("fade-in");
    //                 }
    //             }
    //         });
    //     };

    //     window.addEventListener("scroll", checkVisibility);
    //     window.addEventListener("resize", checkVisibility);

    //     // chiamata iniziale
    //     // checkVisibility();

    //     return () => {
    //         window.removeEventListener("scroll", checkVisibility);
    //         window.removeEventListener("resize", checkVisibility);
    //     };
    // }, [results, query, activeTab]);

    return (
        <div className="consigliaUnaCanzone container">
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

            {(votingAllowed || isAdmin) && (
                <>
                    <VotoProgressivo valore={votedSongs.length} />

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

                            {votedSongsDetails.length > 0 && !loadingVotedSongs && query === "" && (
                                <ul className="song_list">
                                    {votedSongsDetails.map((song, index) => (
                                        <SongItem
                                            key={index}
                                            index={index}
                                            title={song.trackName}
                                            artist={song.artistName}
                                            cover={song.artworkUrl100}
                                            voted={votedSongs.includes(song.trackId)}
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
                                                !votedSongs.includes(song.trackId) &&
                                                votedSongs.length >= 3
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
                                            voted={votedSongs.includes(song.trackId)}
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
                                                !votedSongs.includes(song.trackId) &&
                                                votedSongs.length >= 3
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
                                        voted={votedSongs.includes(song.trackId)}
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
                                        disabled={
                                            !votedSongs.includes(song.trackId) &&
                                            votedSongs.length >= 3
                                        }
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
            )}
        </div>
    );
}
