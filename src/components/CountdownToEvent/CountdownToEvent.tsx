import { useEffect, useState, useRef, useCallback } from "react";
import Countdown from "react-countdown";
import events from "../../data/eventi.json"; // ⬅️ adatta il path
import { useVoting } from "../../context/VotingContext";
import type { EventItem } from "../../context/VotingContext";
import "./countdownToEvent.scss"; // opzionale

// Helper locale: prossimo evento futuro (start > now)
function getNextEventLocal(list: EventItem[], now: Date = new Date()): EventItem | null {
    const t = now.getTime();
    const sorted = [...list].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
    for (const e of sorted) {
        const s = new Date(e.start).getTime();
        const en = new Date(e.end).getTime();
        if (Number.isNaN(s) || Number.isNaN(en)) continue;
        if (t < s) return e; // primo evento con start futuro
    }
    return null;
}

export default function CountdownToEvent() {
    const { refreshVoting } = useVoting();
    const gridRef = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(true);

    const updateSeparators = useCallback(() => {
        const grid = gridRef.current;
        if (!grid) return;
        const boxes = Array.from(grid.querySelectorAll<HTMLDivElement>(".countdown-box"));
        const seps = Array.from(grid.querySelectorAll<HTMLDivElement>(".countdown-separator"));
        seps.forEach(sep => (sep.style.display = ""));
        for (let i = 0; i < boxes.length; i++) {
            const box = boxes[i];
            const nextBox = boxes[i + 1];
            const sep = seps[i];
            if (!sep) continue;
            if (!nextBox || nextBox.offsetTop > box.offsetTop) sep.style.display = "none";
        }
    }, []);

    const next = getNextEventLocal(events as EventItem[]);

    // Hook sempre chiamati
    useEffect(() => {
        const raf = requestAnimationFrame(updateSeparators);
        return () => cancelAnimationFrame(raf);
    }, [updateSeparators]);

    useEffect(() => {
        const onResize = () => requestAnimationFrame(updateSeparators);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [updateSeparators]);

    useEffect(() => {
        if (next) {
            setVisible(true);
        }
    }, [next?.start]);

    const targetDate = next ? new Date(next.start) : null;

    if (!next || !visible) return null;

    return (
        <div className="countdown-container">
            <Countdown
                date={targetDate!}
                onTick={() => requestAnimationFrame(updateSeparators)}
                onComplete={() => {
                    setVisible(false); // nasconde subito
                    refreshVoting(); // poi aggiorna stato globale
                    requestAnimationFrame(updateSeparators);
                }}
                renderer={({ days, hours, minutes, seconds, completed }) => {
                    if (completed) return null;

                    const box = (value: number, label: string) => (
                        <div className="countdown-box">
                            <div className="countdown-value">{String(value).padStart(2, "0")}</div>
                            <div className="countdown-label">{label}</div>
                        </div>
                    );

                    return (
                        <div className="countdown-grid" ref={gridRef}>
                            {box(days, "DAYS")}
                            <div className="countdown-separator">:</div>
                            {box(hours, "HOURS")}
                            <div className="countdown-separator">:</div>
                            {box(minutes, "MINUTES")}
                            <div className="countdown-separator">:</div>
                            {box(seconds, "SECONDS")}
                        </div>
                    );
                }}
            />
        </div>
    );
}
