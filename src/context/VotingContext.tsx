import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import events from "../data/eventi.json";
import { getCurrentEvent } from "../utils/getCurrentEvent";

export type EventItem = {
    start: string;
    end: string;
    location?: string;
    poster?: string;
};

export interface VotingContextValue {
    votingAllowed: boolean; // true se ora ∈ [start, end) di un evento
    currentEvent: EventItem | null; // evento in corso (se presente)
    refreshVoting: () => void; // forza ricalcolo immediato
}

const VotingContext = createContext<VotingContextValue>({
    votingAllowed: false,
    currentEvent: null,
    refreshVoting: () => {}
});

interface ProviderProps {
    children: React.ReactNode;
}

export function VotingProvider({ children }: ProviderProps) {
    const [votingAllowed, setVotingAllowed] = useState<boolean>(false);
    const [currentEvent, setCurrentEvent] = useState<EventItem | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const recompute = useCallback(() => {
        const now = new Date();
        const curr = getCurrentEvent(events as EventItem[], now);
        setCurrentEvent(curr);
        setVotingAllowed(!!curr);
    }, []);

    useEffect(() => {
        // primo calcolo
        recompute();

        // polling frequente per passaggi precisi su start/end
        intervalRef.current = setInterval(recompute, 1000);

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [recompute]);

    const value: VotingContextValue = {
        votingAllowed,
        currentEvent,
        refreshVoting: recompute
    };

    return <VotingContext.Provider value={value}>{children}</VotingContext.Provider>;
}

export function useVoting(): VotingContextValue {
    return useContext(VotingContext);
}
