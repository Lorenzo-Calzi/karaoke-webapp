import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import { showError, showInfo, showSuccess } from "../../lib/toast";
import "./adminPanel.scss";

const ADMIN_EMAILS = ["lorenzocalzi@gmail.com", "aledelia28012000@gmail.com"];

export default function AdminPanel() {
    const [email, setEmail] = useState("");
    const [session, setSession] = useState<any>(null);
    const [overrideActive, setOverrideActive] = useState(false);
    const [loadingOverride, setLoadingOverride] = useState(true);
    const [profiles, setProfiles] = useState<any[]>([]);

    useEffect(() => {
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

        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            const email = data.session?.user?.email;
            if (email && ADMIN_EMAILS.includes(email)) {
                localStorage.setItem("isAdmin", "true");
                fetchOverride();
                fetchProfiles();
            }
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            const email = session?.user?.email;
            if (email && ADMIN_EMAILS.includes(email)) {
                localStorage.setItem("isAdmin", "true");
            }
        });
    }, []);

    const handleLogin = async () => {
        if (!email) return;
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) showError("Errore login: " + error.message);
        else showSuccess("Controlla la tua email per il link di accesso");
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem("isAdmin");
        setSession(null);
    };

    const toggleOverride = async () => {
        const newValue = !overrideActive;

        const { error } = await supabase
            .from("override_settings")
            .update({ enabled: newValue })
            .eq("key", "voting_override");

        if (!error) {
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

    let content;

    if (!session) {
        content = (
            <>
                <h2 className="title">Accesso Admin</h2>
                <div className="input_container">
                    <input
                        placeholder="La tua email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                    />
                    <button onClick={handleLogin}>LOGIN</button>
                </div>
            </>
        );
    } else if (!ADMIN_EMAILS.includes(session.user.email)) {
        content = <p className="paragraph">Accesso non autorizzato</p>;
    } else {
        content = (
            <>
                <h2 className="title">Accesso amministratore confermato</h2>
                <p className="paragraph">Hai accesso illimitato alla piattaforma.</p>

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
                        showInfo(json.message || "Errore");
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
                        className={`fa-solid ${overrideActive ? "fa-toggle-on" : "fa-toggle-off"}`}
                    ></i>
                    <div className="button_content">
                        <span className="button_title">OVERRIDE</span>
                        <p className="button_description">
                            {overrideActive ? "Disabilità votazione" : "Abilita votazione"}
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

                <button className="button" onClick={handleLogout}>
                    <i className="fa-solid fa-arrow-right-from-bracket"></i>
                    <div className="button_content">
                        <span className="button_title">LOGOUT</span>
                        <p className="button_description">Esci dalla piattaforma</p>
                    </div>
                </button>
            </>
        );
    }

    return <div className="adminPanel container">{content}</div>;
}
