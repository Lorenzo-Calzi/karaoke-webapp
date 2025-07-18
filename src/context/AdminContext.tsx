import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import bcrypt from "bcryptjs";

type AdminSession = {
    id: string;
    username: string;
    isSuperadmin: boolean;
};

type AdminContextType = {
    session: AdminSession | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export const AdminProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<AdminSession | null>(null);

    // Recupera da localStorage su mount
    useEffect(() => {
        const username = localStorage.getItem("adminUsername");
        const isSuperadmin = localStorage.getItem("isSuperadmin") === "true";
        const id = localStorage.getItem("adminId");

        if (username && id) {
            setSession({ id, username, isSuperadmin });
        }
    }, []);

    const login = async (username: string, password: string) => {
        const { data: user, error } = await supabase
            .from("admin_users")
            .select("*")
            .eq("username", username)
            .single();

        if (error || !user) return false;

        const match = await bcrypt.compare(password, user.password);
        if (!match) return false;

        const newSession: AdminSession = {
            id: user.id,
            username: user.username,
            isSuperadmin: !!user.is_superadmin
        };

        setSession(newSession);
        localStorage.setItem("adminId", user.id);
        localStorage.setItem("adminUsername", user.username);
        localStorage.setItem("isSuperadmin", JSON.stringify(newSession.isSuperadmin));
        localStorage.setItem("isAdmin", "true");

        return true;
    };

    const logout = () => {
        setSession(null);
        localStorage.removeItem("adminId");
        localStorage.removeItem("adminUsername");
        localStorage.removeItem("isSuperadmin");
        localStorage.removeItem("isAdmin");
    };

    return (
        <AdminContext.Provider value={{ session, login, logout }}>{children}</AdminContext.Provider>
    );
};

export const useAdmin = (): AdminContextType => {
    const context = useContext(AdminContext);
    if (!context) throw new Error("useAdmin must be used within AdminProvider");
    return context;
};
