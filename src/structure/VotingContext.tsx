import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import eventi from "../data/eventi.json";

type VotingContextType = {
    votingAllowed: boolean;
    isAdmin: boolean;
};

const VotingContext = createContext<VotingContextType>({
    votingAllowed: false,
    isAdmin: false
});

export function VotingProvider({ children }: { children: React.ReactNode }) {
    const [votingAllowed, setVotingAllowed] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);

    async function getServerTime(): Promise<Date | null> {
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

    useEffect(() => {
        const checkAdmin = async () => {
            const { data } = await supabase.auth.getSession();
            const email = data.session?.user?.email;
            const isAdmin = email === "lorenzocalzi@gmail.com";
            setIsAdmin(isAdmin);
            if (isAdmin) localStorage.setItem("isAdmin", "true");
        };

        checkAdmin();
    }, []);

    return (
        <VotingContext.Provider value={{ votingAllowed, isAdmin }}>
            {children}
        </VotingContext.Provider>
    );
}

export function useVoting() {
    return useContext(VotingContext);
}
