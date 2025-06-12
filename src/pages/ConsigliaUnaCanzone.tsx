import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./consigliaUnaCanzone.scss";

type ITunesSong = {
    trackId: number;
    trackName: string;
    artistName: string;
    artworkUrl100: string;
    collectionName?: string;
};

export default function ConsigliaUnaCanzone() {
    const [activeTab, setActiveTab] = useState<"search" | "ranking">("search");

    const [query, setQuery] = useState<string>("");
    const [results, setResults] = useState<ITunesSong[]>([]);
    const [votedSongs, setVotedSongs] = useState<number[]>([]);
    const [voterId] = useState(() => {
        const stored = localStorage.getItem("voter_id");
        if (stored) return stored;

        const newId = crypto.randomUUID();
        localStorage.setItem("voter_id", newId);
        return newId;
    });
    const [votedSongsDetails, setVotedSongsDetails] = useState<ITunesSong[]>([]);
    const [loadingVotedSongs, setLoadingVotedSongs] = useState(true);
    const [topSongs, setTopSongs] = useState<
        {
            trackId: number;
            title: string;
            artist: string;
            artworkUrl100: string;
            voteCount: number;
        }[]
    >([]);
    const [animatingId, setAnimatingId] = useState<number | null>(null);

    const normalizeText = (text: string) =>
        text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f']/g, "");

    const getSmartScore = (trackName: string): number => {
        const title = normalizeText(trackName);
        const positive = ["feat", "original", "studio", "official", "single"];
        const negative = ["live", "remix", "karaoke", "tour", "soundtrack", "demo"];

        let score = 0;
        positive.forEach(word => {
            if (title.includes(word)) score += 2;
        });
        negative.forEach(word => {
            if (title.includes(word)) score -= 3;
        });

        return score;
    };

    const searchSongs = async (searchTerm: string) => {
        const trimmed = searchTerm.trim();
        if (!trimmed) {
            setResults([]);
            return;
        }

        try {
            const response = await fetch(
                `https://itunes.apple.com/search?term=${encodeURIComponent(
                    searchTerm
                )}&entity=song&country=IT&limit=50`
            );

            const data = await response.json();

            const loweredWords = normalizeText(trimmed).split(/\s+/);
            const excludedKeywords = ["live", "remix", "karaoke", "tour", "soundtrack", "demo"];
            const excludedAlbums = ["rap italiano", "playlist", "compilation", "top hits"];

            const songs: ITunesSong[] = data.results.map((song: ITunesSong) => ({
                trackId: song.trackId,
                trackName: song.trackName,
                artistName: song.artistName,
                artworkUrl100: song.artworkUrl100,
                collectionName: song.collectionName
            }));

            const filtered = songs.filter(s => {
                const title = normalizeText(s.trackName);
                const artist = normalizeText(s.artistName);
                const album = normalizeText(s.collectionName || "");

                const isRelevant = loweredWords.every(
                    word => title.includes(word) || artist.includes(word)
                );

                const isExcludedByTitle = excludedKeywords.some(k => title.includes(k));
                const isExcludedByAlbum = excludedAlbums.some(a => album.includes(a));

                const isValid =
                    typeof s.trackId === "number" &&
                    s.trackId > 0 &&
                    s.trackName?.trim() &&
                    s.artistName?.trim() &&
                    s.artworkUrl100?.trim();

                return isRelevant && !isExcludedByTitle && !isExcludedByAlbum && isValid;
            });

            const uniqueMap = new Map<string, ITunesSong>();
            filtered.forEach(song => {
                const key = `${normalizeText(song.trackName)}|${normalizeText(song.artistName)}`;
                if (!uniqueMap.has(key)) uniqueMap.set(key, song);
            });

            const sorted = Array.from(uniqueMap.values()).sort(
                (a, b) => getSmartScore(b.trackName) - getSmartScore(a.trackName)
            );

            setResults(sorted);
        } catch (error) {
            console.error("Errore durante la ricerca:", error);
        }
    };

    const handleVote = async (
        trackId: number,
        title: string,
        artist: string,
        artworkUrl100: string
    ) => {
        const alreadyVoted = votedSongs.includes(trackId);

        // ⛔ Limite di 3 voti
        if (!alreadyVoted && votedSongs.length >= 3) {
            return;
        }

        // ❤️ ANIMAZIONE
        setAnimatingId(trackId);
        setTimeout(() => {
            setAnimatingId(null);
        }, 400);

        if (alreadyVoted) {
            // ✅ Aggiorna SUBITO il cuore (grigio)
            setVotedSongs(prev => prev.filter(id => id !== trackId));

            // 🗑️ Rimuovi dal DB
            const { error } = await supabase
                .from("votes")
                .delete()
                .eq("trackId", trackId)
                .eq("voterId", voterId);

            if (!error) {
                // ⏱️ Ritarda l’aggiornamento classifica / lista
                setTimeout(() => {
                    fetchTopSongs();
                }, 400);
            }
        } else {
            // ➕ Inserisci nel DB
            const { error } = await supabase.from("votes").insert([
                {
                    trackId,
                    title,
                    artist,
                    artworkUrl100,
                    voterId
                }
            ]);

            if (!error) {
                // ✅ Subito visivo
                setVotedSongs(prev => [...prev, trackId]);
                fetchTopSongs();

                // 🔄 Svuota ricerca dopo breve delay
                setTimeout(() => {
                    setQuery("");
                }, 400);
            }
        }
    };

    const fetchTopSongs = async () => {
        const { data, error } = await supabase
            .from("votes")
            .select("trackId, title, artist, artworkUrl100", { count: "exact" })
            .order("trackId", { ascending: true });

        if (error) {
            console.error("Errore nel recupero classifica:", error.message);
            return;
        }

        if (data) {
            const voteMap = new Map<
                number,
                {
                    title: string;
                    artist: string;
                    artworkUrl100: string;
                    count: number;
                }
            >();

            for (const row of data) {
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

            const topList = Array.from(voteMap.entries())
                .map(([trackId, info]) => ({
                    trackId,
                    title: info.title,
                    artist: info.artist,
                    artworkUrl100: info.artworkUrl100,
                    voteCount: info.count
                }))
                .sort((a, b) => b.voteCount - a.voteCount);

            setTopSongs(topList);
        }
    };

    useEffect(() => {
        fetchTopSongs();
    }, []);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            searchSongs(query);
        }, 200);

        return () => clearTimeout(delayDebounce);
    }, [query]);

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

                // Rimuovi eventuali duplicati
                const unique = new Map<number, ITunesSong>();
                for (const song of data) {
                    if (
                        song.trackId &&
                        song.title &&
                        song.artist &&
                        song.artworkUrl100 &&
                        !unique.has(song.trackId)
                    ) {
                        unique.set(song.trackId, {
                            trackId: song.trackId,
                            trackName: song.title,
                            artistName: song.artist,
                            artworkUrl100: song.artworkUrl100
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

        fetchVotedSongsDetails();
    }, [votedSongs]);

    return (
        <div className="consigliaUnaCanzone container">
            <h2 className="title">Consigliaci delle canzoni</h2>
            <p>Chiedi al DJ di suonare le tue canzoni preferite</p>
            <p>Canzoni votate: {votedSongs.length}/3</p>

            <div className="tabs">
                <button
                    className={activeTab === "search" ? "tab active" : "tab"}
                    onClick={() => setActiveTab("search")}
                >
                    Cerca
                </button>
                <button
                    className={activeTab === "ranking" ? "tab active" : "tab"}
                    onClick={() => setActiveTab("ranking")}
                >
                    Classifica
                </button>
            </div>

            {activeTab === "search" && (
                <>
                    <input
                        type="text"
                        placeholder="Cerca la tua canzone preferita..."
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        className="search_bar"
                    />
                    {loadingVotedSongs && <p className="loader">Caricamento voti...</p>}

                    {votedSongsDetails.length > 0 && !loadingVotedSongs && query === "" && (
                        <div className="voted_section">
                            <ul className="song_list">
                                {votedSongsDetails.map(song => (
                                    <li key={song.trackId} className="song_item">
                                        <img
                                            src={song.artworkUrl100}
                                            alt={song.trackName}
                                            className="song_cover"
                                        />
                                        <div className="song_info">
                                            <span className="song_title">{song.trackName}</span>
                                            <span className="song_singer">{song.artistName}</span>
                                        </div>
                                        <div
                                            className="song_vote"
                                            onClick={() =>
                                                handleVote(
                                                    song.trackId,
                                                    song.trackName,
                                                    song.artistName,
                                                    song.artworkUrl100
                                                )
                                            }
                                        >
                                            <i
                                                className={`fa-heart ${
                                                    votedSongs.includes(song.trackId)
                                                        ? "fa-solid"
                                                        : "fa-regular"
                                                } ${
                                                    animatingId === song.trackId
                                                        ? "animate-like"
                                                        : ""
                                                }`}
                                                style={{
                                                    color: votedSongs.includes(song.trackId)
                                                        ? "#FF2F40"
                                                        : "white"
                                                }}
                                            ></i>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {results.length > 0 && query !== "" && (
                        <ul className="song_list">
                            {results.map(song => (
                                <li key={song.trackId} className="song_item">
                                    <img
                                        src={song.artworkUrl100}
                                        alt={song.trackName}
                                        className="song_cover"
                                    />
                                    <div className="song_info">
                                        <span className="song_title">{song.trackName}</span>
                                        <span className="song_singer">{song.artistName}</span>
                                    </div>
                                    <div
                                        className={`song_vote ${
                                            !votedSongs.includes(song.trackId) &&
                                            votedSongs.length >= 3
                                                ? "disabled"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            handleVote(
                                                song.trackId,
                                                song.trackName,
                                                song.artistName,
                                                song.artworkUrl100
                                            )
                                        }
                                    >
                                        <i
                                            className={`fa-heart ${
                                                votedSongs.includes(song.trackId)
                                                    ? "fa-solid"
                                                    : "fa-regular"
                                            } ${
                                                animatingId === song.trackId ? "animate-like" : ""
                                            }`}
                                            style={{
                                                color: votedSongs.includes(song.trackId)
                                                    ? "#FF2F40"
                                                    : "white"
                                            }}
                                        ></i>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}

            {activeTab === "ranking" && topSongs.length > 0 && (
                <>
                    <ul className="song_list">
                        {topSongs.map(song => (
                            <li key={song.trackId} className="song_item">
                                <img
                                    src={song.artworkUrl100}
                                    alt={song.title}
                                    className="song_cover"
                                />
                                <div className="song_info">
                                    <span className="song_title">{song.title}</span>
                                    <span className="song_singer">{song.artist}</span>
                                </div>
                                <div
                                    className={`song_vote ${
                                        !votedSongs.includes(song.trackId) && votedSongs.length >= 3
                                            ? "disabled"
                                            : ""
                                    }`}
                                    onClick={() =>
                                        handleVote(
                                            song.trackId,
                                            song.title,
                                            song.artist,
                                            song.artworkUrl100
                                        )
                                    }
                                >
                                    <span>{song.voteCount}</span>
                                    <i
                                        className={`fa-heart ${
                                            votedSongs.includes(song.trackId)
                                                ? "fa-solid"
                                                : "fa-regular"
                                        } ${animatingId === song.trackId ? "animate-like" : ""}`}
                                        style={{
                                            color: votedSongs.includes(song.trackId)
                                                ? "#FF2F40"
                                                : "white"
                                        }}
                                    ></i>
                                </div>
                            </li>
                        ))}
                    </ul>
                </>
            )}
        </div>
    );
}
