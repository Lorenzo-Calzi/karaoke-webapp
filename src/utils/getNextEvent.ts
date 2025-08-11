import eventi from "../data/eventi.json";

export function getNextEvent() {
    const now = new Date();
    return (
        eventi
            .map(event => ({
                ...event,
                startDate: new Date(event.start)
            }))
            .filter(event => event.startDate > now)
            .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0] || null
    );
}
