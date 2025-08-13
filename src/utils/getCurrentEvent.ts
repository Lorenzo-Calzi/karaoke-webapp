export type EventItem = {
    start: string; // ISO con offset, es. "2025-08-13T12:08:00+02:00"
    end: string; // ISO con offset
    location?: string;
    poster?: string;
};

export function getCurrentEvent(events: EventItem[], now: Date = new Date()): EventItem | null {
    if (!Array.isArray(events) || events.length === 0) return null;

    // Copia + ordina (nel dubbio) per start crescente
    const sorted = [...events].sort(
        (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    const t = now.getTime();

    // Evento in corso se: start <= now < end  (end esclusivo)
    for (const e of sorted) {
        const s = new Date(e.start).getTime();
        const en = new Date(e.end).getTime();
        if (Number.isNaN(s) || Number.isNaN(en)) continue; // salta record malformati
        if (s <= t && t < en) return e;
    }

    return null;
}
