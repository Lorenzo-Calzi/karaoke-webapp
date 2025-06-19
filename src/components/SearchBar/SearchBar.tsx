import type { RefObject } from "react";
import "./searchBar.scss";

type Props = {
    query: string;
    setQuery: (val: string) => void;
    searchSongs: (term: string) => void;
    searchBarRef: RefObject<HTMLInputElement | null>;
};

export default function SearchBar({ query, setQuery, searchSongs, searchBarRef }: Props) {
    return (
        <div className="search_bar_container">
            <input
                ref={searchBarRef}
                type="text"
                placeholder="Cerca la tua canzone preferita..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="search_bar"
                onKeyDown={e => {
                    if (e.key === "Enter") {
                        e.preventDefault();
                        searchSongs(query);
                        searchBarRef.current?.blur();
                    }
                }}
            />
        </div>
    );
}
