import "./tabs.scss";

type Props = {
    activeTab: "search" | "ranking";
    onTabChange: (tab: "search" | "ranking") => void;
};

export default function Tabs({ activeTab, onTabChange }: Props) {
    return (
        <div className="tabs">
            <button
                className={activeTab === "search" ? "tab active" : "tab"}
                onClick={() => onTabChange("search")}
            >
                Cerca
            </button>
            <button
                className={activeTab === "ranking" ? "tab active" : "tab"}
                onClick={() => onTabChange("ranking")}
            >
                Classifica
            </button>
        </div>
    );
}
