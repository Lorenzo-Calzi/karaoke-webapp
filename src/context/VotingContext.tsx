import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import eventi from "../data/eventi.json";

type VotingContextType = {
    votingAllowed: boolean;
};

const VotingContext = createContext<VotingContextType>({
    votingAllowed: false
});

export function VotingProvider({ children }: { children: React.ReactNode }) {
    const [votingAllowed, setVotingAllowed] = useState(false);

    async function getServerTime(): Promise<Date | null> {
        if (!navigator.onLine) {
            console.warn("Sei offline. Impossibile recuperare l'orario dal server.");
            return null;
        }

        const { data, error } = await supabase.rpc("get_server_time");
        if (error) {
            console.error("Errore nel recuperare l’orario dal server:", error);
            return null;
        }
        return new Date(data);
    }

    async function isVotingActiveNow(): Promise<boolean> {
        const now = await getServerTime();
        if (!now) return false;

        // 1. Controlla override
        const { data: override } = await supabase
            .from("override_settings")
            .select("enabled")
            .eq("key", "voting_override")
            .single();

        const overrideAttivo = override?.enabled === true;

        // 2. Controlla eventi
        const eventoAttivo = eventi.some(event => {
            const start = new Date(event.start);
            const end = new Date(event.end);
            return now >= start && now <= end;
        });

        return overrideAttivo || eventoAttivo;
    }

    useEffect(() => {
        const checkVoting = async () => {
            const allowed = await isVotingActiveNow();
            setVotingAllowed(allowed);
        };

        checkVoting();
        const interval = setInterval(checkVoting, 60000);
        return () => clearInterval(interval);
    }, []);

    return <VotingContext.Provider value={{ votingAllowed }}>{children}</VotingContext.Provider>;
}

export function useVoting() {
    return useContext(VotingContext);
}
