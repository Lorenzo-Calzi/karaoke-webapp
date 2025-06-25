import { useEffect, useState, useRef } from "react";
import { supabase } from "../../supabaseClient";
import { useVoting } from "../../structure/VotingContext";
import VotoProgressivo from "../../components/VotoProgressivo/VotoProgressivo";
import Tabs from "../../components/Tabs/Tabs";
import SearchBar from "../../components/SearchBar/SearchBar";
import SongItem from "../../components/SongItem/SongItem";
import "./consigliaUnaCanzone.scss";

type SpotifySong = {
    trackId: string;
    trackName: string;
    artistName: string;
    artworkUrl100: string;
    popularity: number;
};

const apiBaseUrl = import.meta.env.DEV ? "https://karaoke-webapp.vercel.app" : "";

export default function ConsigliaUnaCanzone() {
    const { votingAllowed } = useVoting();

    const isAdmin = localStorage.getItem("isAdmin") === "true";
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
            // 1. Ottieni token da backend
            const tokenRes = await fetch(`${apiBaseUrl}/api/spotify-token`);
            const tokenData: { access_token: string } = await tokenRes.json();
            const access_token = tokenData.access_token;

            // 2. Chiamata alle API Spotify
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

            type SpotifyAPITrack = {
                id: string;
                name: string;
                popularity: number;
                artists: { name: string }[];
                album: { images: { url: string }[] };
            };

            const data: {
                tracks: {
                    items: SpotifyAPITrack[];
                };
            } = await res.json();

            const loweredWords = normalizeText(trimmed).split(/\s+/);

            const rawTracks: SpotifySong[] = data.tracks.items.map(item => ({
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
                    typeof track.trackId === "string" &&
                    track.trackId.trim() !== "" &&
                    track.trackName.trim() !== "" &&
                    track.artistName.trim() !== "" &&
                    track.artworkUrl100.trim() !== "";

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

            setResults(sorted);
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
                await fetchVotedSongsDetails(); // ✅ aggiorna lista canzoni votate
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
                setVotedSongs(prev => [...prev, trackId]);
                await fetchVotedSongsDetails(); // ✅ aggiorna lista canzoni votate
                fetchTopSongs();

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
                string,
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
                        popularity: 0
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

    useEffect(() => {
        fetchTopSongs();
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

    useEffect(() => {
        const checkVisibility = () => {
            const searchBarBottom = searchBarRef.current?.getBoundingClientRect().bottom || 0;
            const items = document.querySelectorAll(".song_item");

            items.forEach(item => {
                const itemTop = item.getBoundingClientRect().top;
                const el = item as HTMLElement;

                el.style.opacity = "1";
                el.style.animation = "normal";

                if (itemTop < searchBarBottom) {
                    el.classList.remove("fade-in");
                    el.classList.add("invisible");
                } else {
                    if (el.classList.contains("invisible")) {
                        el.classList.remove("invisible");
                        el.classList.add("fade-in");
                    }
                }
            });
        };

        window.addEventListener("scroll", checkVisibility);
        window.addEventListener("resize", checkVisibility);

        // chiamata iniziale
        // checkVisibility();

        return () => {
            window.removeEventListener("scroll", checkVisibility);
            window.removeEventListener("resize", checkVisibility);
        };
    }, [results, query, activeTab]);

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
                                                votedSongs.length >= 5
                                            }
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
