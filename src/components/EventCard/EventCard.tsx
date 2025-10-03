import { useEffect, useRef } from "react";
import { LuClock10 } from "react-icons/lu";
import "./eventCard.scss";

type Event = {
    start: string;
    end: string;
    location: string;
    poster?: string;
};

export default function EventCard({ event, index }: { event: Event; index: number }) {
    const startDate = new Date(event.start);
    const day = startDate.getDate();
    const month = startDate.toLocaleString("it-IT", { month: "short" });
    const time = startDate.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" });

    const cardRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const el = cardRef.current;
        if (!el) return;

        const prefersReduced =
            window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (prefersReduced) {
            el.classList.add("inview");
            return;
        }

        const io = new IntersectionObserver(
            entries => {
                for (const e of entries) {
                    if (e.isIntersecting) {
                        e.target.classList.add("inview");
                        io.unobserve(e.target);
                    }
                }
            },
            { threshold: 0.15 }
        );

        io.observe(el);
        return () => io.disconnect();
    }, []);

    return (
        <div ref={cardRef} className="event-card" style={{ ["--i" as string]: index }}>
            <div className="event-date-box">
                <span className="event-day">{day}</span>
                <span className="event-month">{month}</span>
            </div>
            <div className="event-content">
                <div className="poster-container">
                    <div className="poster" style={{ backgroundImage: `url(${event.poster})` }} />
                    <span className="event-location">{event.location}</span>
                </div>
                <p className="paragraph event-description">DJ SET & KARAOKE</p>
                <div className="event-time-box">
                    <LuClock10 />
                    <span>{time}</span>
                </div>
            </div>
        </div>
    );
}
