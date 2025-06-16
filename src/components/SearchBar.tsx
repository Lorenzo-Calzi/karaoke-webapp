type SearchBarProps = {
    query: string;
    onChange: (value: string) => void;
};

export default function SearchBar({ query, onChange }: SearchBarProps) {
    return (
        <input
            type="text"
            placeholder="Cerca la tua canzone preferita..."
            value={query}
            onChange={e => onChange(e.target.value)}
            className="search_bar"
        />
    );
}
