import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import events from "../data/eventi.json";
import { supabase } from "../supabaseClient";
import { getCurrentEvent } from "../utils/getCurrentEvent";

export type EventItem = {
    start: string;
    end: string;
    location?: string;
    poster?: string;
};

export interface VotingContextValue {
    votingAllowed: boolean; // true se manualOpen || evento in corso
    currentEvent: EventItem | null;
    manualOpen: boolean; // override admin
    refreshVoting: () => void; // ricalcola da eventi + manualOpen
    openVotingNow: () => Promise<void>; // admin: forza apertura (persistita)
    closeVotingNow: () => Promise<void>; // admin: chiudi (persistita)
}

const VotingContext = createContext<VotingContextValue>({
    votingAllowed: false,
    currentEvent: null,
    manualOpen: false,
    refreshVoting: () => {},
    openVotingNow: async () => {},
    closeVotingNow: async () => {}
});

interface ProviderProps {
    children: React.ReactNode;
}

// ------ Helpers persistenza manualOpen ------
async function fetchManualOpen(): Promise<boolean> {
    try {
        const { data, error } = await supabase
            .from("override_settings")
            .select("enabled")
            .eq("key", "voting_override")
            .single();

        if (!error && data && typeof data.enabled === "boolean") {
            localStorage.setItem("voting_manual_open", data.enabled ? "1" : "0");
            return data.enabled;
        }
    } catch (err) {
        console.error("fetchManualOpen error:", err);
    }
    // fallback locale se il DB non risponde
    return localStorage.getItem("voting_manual_open") === "1";
}

async function persistManualOpen(value: boolean): Promise<void> {
    try {
        const { error } = await supabase
            .from("override_settings")
            .update({ enabled: value })
            .eq("key", "voting_override");

        if (error) {
            // se la riga non esiste, prova insert
            await supabase.from("override_settings").insert({
                key: "voting_override",
                enabled: value
            });
        }
    } catch (err) {
        console.error("persistManualOpen error:", err);
    } finally {
        localStorage.setItem("voting_manual_open", value ? "1" : "0");
    }
}

export function VotingProvider({ children }: ProviderProps) {
    const [currentEvent, setCurrentEvent] = useState<EventItem | null>(null);
    const [manualOpen, setManualOpen] = useState<boolean>(false);
    const [votingAllowed, setVotingAllowed] = useState<boolean>(false);

    const eventTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const manualTickRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const recompute = useCallback(() => {
        const now = new Date();
        const curr = getCurrentEvent(events as EventItem[], now);
        setCurrentEvent(curr);
        setVotingAllowed(manualOpen || !!curr);
    }, [manualOpen]);

    const refreshManualOpen = useCallback(async () => {
        const remote = await fetchManualOpen();
        setManualOpen(remote);
    }, []);

    const refreshVoting = useCallback(() => {
        // ricalcola con lo stato manualOpen corrente
        recompute();
    }, [recompute]);

    const openVotingNow = useCallback(async () => {
        setManualOpen(true);
        await persistManualOpen(true);
        recompute();
    }, [recompute]);

    const closeVotingNow = useCallback(async () => {
        setManualOpen(false);
        await persistManualOpen(false);
        recompute();
    }, [recompute]);

    // Init
    useEffect(() => {
        // carica manualOpen iniziale (da Supabase o fallback)
        refreshManualOpen().then(recompute);
        // tick degli eventi (preciso su start/end)
        eventTickRef.current = setInterval(recompute, 1000);
        // sync manualOpen periodico (per altri client) – leggero, ogni 10s
        manualTickRef.current = setInterval(refreshManualOpen, 10000);

        return () => {
            if (eventTickRef.current) clearInterval(eventTickRef.current);
            if (manualTickRef.current) clearInterval(manualTickRef.current);
        };
    }, [recompute, refreshManualOpen]);

    const value: VotingContextValue = {
        votingAllowed,
        currentEvent,
        manualOpen,
        refreshVoting,
        openVotingNow,
        closeVotingNow
    };

    return <VotingContext.Provider value={value}>{children}</VotingContext.Provider>;
}

export function useVoting(): VotingContextValue {
    return useContext(VotingContext);
}
