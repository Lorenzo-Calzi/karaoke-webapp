import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { showError, showSuccess } from "../../lib/toast";
import { supabase } from "../../supabaseClient";
import { useAdmin } from "../../context/AdminContext";
import "./adminPanel.scss";

export default function AdminPanel() {
    const { session, login, logout } = useAdmin();
    const navigate = useNavigate();
    const isAdmin = !!session;
    const isSuperadmin = session?.isSuperadmin;

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [overrideActive, setOverrideActive] = useState(false);
    const [loadingOverride, setLoadingOverride] = useState(true);
    const [profiles, setProfiles] = useState<any[]>([]);
    const [justLoggedIn, setJustLoggedIn] = useState(false);

    const fetchOverride = async () => {
        const { data, error } = await supabase
            .from("override_settings")
            .select("enabled")
            .eq("key", "voting_override")
            .single();

        if (!error && data) {
            setOverrideActive(data.enabled);
        }

        setLoadingOverride(false);
    };

    const fetchProfiles = async () => {
        const { data, error } = await supabase
            .from("social_profiles")
            .select("id, username, label, on_air, force_blue")
            .order("order", { ascending: true });

        if (!error && data) {
            setProfiles(data);
        }
    };

    const handleLogin = async () => {
        if (!username || !password) {
            showError("Inserisci username e password");
            return;
        }

        const success = await login(username, password);
        if (success) {
            showSuccess("Login riuscito");
            fetchOverride();
            fetchProfiles();
            setJustLoggedIn(true);
        } else {
            showError("Credenziali non valide");
        }
    };

    const toggleOverride = async () => {
        const newValue = !overrideActive;

        const { error } = await supabase
            .from("override_settings")
            .update({ enabled: newValue })
            .eq("key", "voting_override");

        if (error) {
            showError("Errore override: " + error.message);
        } else {
            showSuccess("Override aggiornato");
            setOverrideActive(newValue);
        }
    };

    const toggleOnAir = async (id: string, newValue: boolean) => {
        const { error } = await supabase
            .from("social_profiles")
            .update({ on_air: newValue })
            .eq("id", id);

        if (!error) {
            setProfiles(prev => prev.map(p => (p.id === id ? { ...p, on_air: newValue } : p)));
            showSuccess("Stato aggiornato");
        } else {
            showError("Errore aggiornamento stato");
        }
    };

    useEffect(() => {
        if (session) {
            fetchOverride();
            fetchProfiles();
        }
    }, [session]);

    useEffect(() => {
        if (justLoggedIn && session && !session.isSuperadmin) {
            navigate("/admin/karaokeList");
        }
    }, [justLoggedIn, session, navigate]);

    if (!session) {
        return (
            <div className="adminPanel container">
                <h2 className="title">Accesso Admin</h2>
                <div className="input_container">
                    <input
                        placeholder="Username"
                        value={username}
                        onChange={e => setUsername(e.target.value)}
                    />
                    <input
                        placeholder="Password"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <button onClick={handleLogin}>LOGIN</button>
                </div>
            </div>
        );
    }

    return (
        <div className="adminPanel container">
            <h2 className="title">Benvenuto, {session.username}</h2>

            <button
                className="button"
                onClick={() => {
                    window.location.href = "/admin/karaokeList";
                }}
            >
                <i className="fa-solid fa-microphone"></i>
                <div className="button_content">
                    <span className="button_title">KARAOKE</span>
                    <p className="button_description">Gestisci la lista</p>
                </div>
            </button>

            {isSuperadmin && (
                <>
                    <button
                        className="button"
                        onClick={() => {
                            window.open(
                                "https://mzcqosceyruvhzguvbcc.functions.supabase.co/functions/v1/exportVotes",
                                "_self"
                            );
                        }}
                    >
                        <i className="fa-solid fa-file-arrow-down"></i>
                        <div className="button_content">
                            <span className="button_title">REPORT</span>
                            <p className="button_description">Scarica il CSV</p>
                        </div>
                    </button>

                    <button
                        className="button"
                        onClick={async () => {
                            const confirm = window.confirm(
                                "Sicuro di voler svuotare la tabella votes?"
                            );
                            if (!confirm) return;

                            const res = await fetch(
                                "https://mzcqosceyruvhzguvbcc.functions.supabase.co/functions/v1/clearVotes",
                                { method: "POST" }
                            );
                            const json = await res.json();
                            showSuccess(json.message || "Errore");
                        }}
                    >
                        <i className="fa-solid fa-trash"></i>
                        <div className="button_content">
                            <span className="button_title">SVUOTA</span>
                            <p className="button_description">Svuota tabella voti</p>
                        </div>
                    </button>

                    <button
                        className="button"
                        onClick={async () => {
                            const res = await fetch(
                                "https://mzcqosceyruvhzguvbcc.functions.supabase.co/functions/v1/seedVotes",
                                { method: "POST" }
                            );
                            const json = await res.json();
                            showSuccess(json.message || "Errore");
                        }}
                    >
                        <i className="fa-solid fa-upload"></i>
                        <div className="button_content">
                            <span className="button_title">POPOLA</span>
                            <p className="button_description">Popola tabella voti</p>
                        </div>
                    </button>

                    <button className="button" onClick={toggleOverride} disabled={loadingOverride}>
                        <i
                            className={`fa-solid ${
                                overrideActive ? "fa-toggle-on" : "fa-toggle-off"
                            }`}
                        />
                        <div className="button_content">
                            <span className="button_title">OVERRIDE</span>
                            <p className="button_description">
                                {overrideActive ? "Disabilita votazione" : "Abilita votazione"}
                            </p>
                        </div>
                    </button>

                    <div className="social_status_list">
                        {profiles.map(
                            profile =>
                                !profile.force_blue && (
                                    <div key={profile.id} className="social_status_row">
                                        <p className="paragraph">{profile.username}</p>
                                        <i
                                            className="fa-solid fa-square-check"
                                            style={{ color: profile.on_air ? "#7CFC00" : "" }}
                                            onClick={() => toggleOnAir(profile.id, !profile.on_air)}
                                        ></i>
                                    </div>
                                )
                        )}
                    </div>
                </>
            )}

            <button className="button" onClick={logout}>
                <i className="fa-solid fa-arrow-right-from-bracket"></i>
                <div className="button_content">
                    <span className="button_title">LOGOUT</span>
                    <p className="button_description">Esci dalla piattaforma</p>
                </div>
            </button>
        </div>
    );
}
