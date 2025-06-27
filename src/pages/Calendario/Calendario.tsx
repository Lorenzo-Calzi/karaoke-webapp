import eventi from "../../data/eventi.json";
import EventCard from "../../components/EventCard/EventCard";
import "./calendario.scss";

export default function Calendario() {
    return (
        <div className="calendario container">
            <h2 className="title">Prossimi Eventi</h2>
            <div className="calendario-list">
                {eventi.map((event, idx) => (
                    <EventCard key={idx} event={event} />
                ))}
            </div>
        </div>
    );
}
