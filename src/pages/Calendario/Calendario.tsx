import eventi from "../../data/eventi.json";
import EventCard from "../../components/EventCard/EventCard";
import "./calendario.scss";

export default function Calendario() {
    const now = new Date();
    const eventiFuturi = eventi.filter(event => {
        const startDate = new Date(event.start);
        return startDate >= now;
    });

    return (
        <div className="calendario container">
            <h2 className="title">Prossimi Eventi</h2>
            <div className="calendario-list">
                {eventiFuturi.map((event, idx) => (
                    <EventCard key={idx} event={event} />
                ))}
            </div>
        </div>
    );
}
