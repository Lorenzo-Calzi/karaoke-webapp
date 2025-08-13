import { useEffect, useRef, useCallback, useState } from "react";
import Countdown from "react-countdown";
import events from "../../data/eventi.json";
import { useVoting } from "../../context/VotingContext";
import type { EventItem } from "../../context/VotingContext";
import "./countdownToEvent.scss";

// Prossimo evento futuro (start > now)
function getNextEventLocal(list: EventItem[], now: Date = new Date()): EventItem | null {
    const t = now.getTime();
    const sorted = [...list].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );
    for (const e of sorted) {
        const s = new Date(e.start).getTime();
        const en = new Date(e.end).getTime();
        if (Number.isNaN(s) || Number.isNaN(en)) continue;
        if (t < s) return e;
    }
    return null;
}

export default function CountdownToEvent() {
    const { refreshVoting, manualOpen } = useVoting();
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

    // Hooks sempre chiamati
    useEffect(() => {
        const raf = requestAnimationFrame(updateSeparators);
        return () => cancelAnimationFrame(raf);
    }, [updateSeparators]);

    useEffect(() => {
        const onResize = () => requestAnimationFrame(updateSeparators);
        window.addEventListener("resize", onResize);
        return () => window.removeEventListener("resize", onResize);
    }, [updateSeparators]);

    // Se cambia "next" (dopo uno scatto), ri-mostra il countdown
    useEffect(() => {
        setVisible(true);
    }, [next?.start]);

    // Se l'admin apre manualmente le votazioni, nascondi il countdown subito
    useEffect(() => {
        if (manualOpen) setVisible(false);
    }, [manualOpen]);

    // Condizioni di visibilità:
    // - manualOpen → countdown nascosto
    // - nessun prossimo evento → niente countdown
    // - visible=false → niente countdown (evita flicker allo scatto)
    if (manualOpen || !next || !visible) return null;

    const targetDate = new Date(next.start);

    return (
        <div className="countdown-container">
            <Countdown
                date={targetDate}
                onTick={() => requestAnimationFrame(updateSeparators)}
                onComplete={() => {
                    // nascondi subito per evitare flicker, poi aggiorna lo stato globale
                    setVisible(false);
                    refreshVoting();
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
