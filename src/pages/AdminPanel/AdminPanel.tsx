import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { showError, showSuccess } from "../../lib/toast";
import { supabase } from "../../supabaseClient";
import { useAdmin } from "../../context/AdminContext";
import { useVoting } from "../../context/VotingContext"; // ⬅️ nuovo
import { BsMusicNoteList } from "react-icons/bs";
import CustomModal from "../../components/CustomModal/CustomModal";
import "./adminPanel.scss";

type SocialProfile = {
    id: string;
    username: string;
    label?: string;
    on_air: boolean;
    force_blue?: boolean;
};

export default function AdminPanel() {
    const { session, login, logout } = useAdmin();
    const { manualOpen, openVotingNow, closeVotingNow } = useVoting(); // ⬅️ nuovo
    const navigate = useNavigate();
    const isSuperadmin = session?.isSuperadmin;

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");

    // override votazioni (solo per UI: lo stato vero è nel context)
    const [togglingOverride, setTogglingOverride] = useState(false);

    const [profiles, setProfiles] = useState<SocialProfile[]>([]);
    const [justLoggedIn, setJustLoggedIn] = useState(false);

    // modal di conferma riusabile
    const [modalVisible, setModalVisible] = useState(false);
    const [modalAction, setModalAction] = useState<() => void>(() => {});
    const [modalDescription, setModalDescription] = useState("");

    const fetchProfiles = async () => {
        const { data, error } = await supabase
            .from("social_profiles")
            .select("id, username, label, on_air, force_blue")
            .order("order", { ascending: true });

        if (!error && data) {
            setProfiles(data as SocialProfile[]);
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
            fetchProfiles();
            setJustLoggedIn(true);
        } else {
            showError("Credenziali non valide");
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

    const confirmAction = (description: string, action: () => void) => {
        setModalDescription(description);
        setModalAction(() => action);
        setModalVisible(true);
    };

    // Caricamenti dopo login
    useEffect(() => {
        if (session) {
            fetchProfiles();
        }
    }, [session]);

    // Se non superadmin, dopo login porta alla pagina lista
    useEffect(() => {
        if (justLoggedIn && session && !session.isSuperadmin) {
            navigate("/admin/karaokeList");
        }
    }, [justLoggedIn, session, navigate]);

    // --- RENDER LOGIN ---
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

    // --- RENDER ADMIN PANEL ---
    return (
        <div className="adminPanel container">
            <CustomModal
                show={modalVisible}
                onClose={() => setModalVisible(false)}
                description={modalDescription}
                onPrimaryAction={() => {
                    modalAction();
                    setModalVisible(false);
                }}
                showSecondaryButton={true}
                timer={false}
            />

            <h2 className="title">Benvenuto, {session.username}</h2>

            <button
                className="button"
                onClick={() => {
                    window.location.href = "/admin/karaokeList";
                }}
            >
                <BsMusicNoteList />
                <div className="button_content">
                    <span className="button_title">LISTA</span>
                    <p className="button_description">Gestisci la lista</p>
                </div>
            </button>

            {isSuperadmin && (
                <>
                    {/* SVUOTA LISTA KARAOKE */}
                    <button
                        className="button"
                        onClick={() => {
                            confirmAction(
                                "Sicuro di voler svuotare la lista karaoke?",
                                async () => {
                                    const { error } = await supabase
                                        .from("karaoke_list")
                                        .delete()
                                        .not("id", "is", null);
                                    if (error) {
                                        showError(
                                            "Errore durante la cancellazione: " + error.message
                                        );
                                    } else {
                                        showSuccess("Lista karaoke svuotata!");
                                    }
                                }
                            );
                        }}
                    >
                        <i className="fa-solid fa-trash"></i>
                        <div className="button_content">
                            <span className="button_title">SVUOTA</span>
                            <p className="button_description">Svuota tabella lista</p>
                        </div>
                    </button>

                    {/* REPORT CSV */}
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

                    {/* SVUOTA VOTI */}
                    <button
                        className="button"
                        onClick={() => {
                            confirmAction(
                                "Sicuro di voler svuotare la tabella votes?",
                                async () => {
                                    const res = await fetch(
                                        "https://mzcqosceyruvhzguvbcc.functions.supabase.co/functions/v1/clearVotes",
                                        { method: "POST" }
                                    );
                                    const json = await res.json();
                                    showSuccess(json.message || "Operazione completata");
                                }
                            );
                        }}
                    >
                        <i className="fa-solid fa-trash"></i>
                        <div className="button_content">
                            <span className="button_title">SVUOTA</span>
                            <p className="button_description">Svuota tabella voti</p>
                        </div>
                    </button>

                    {/* POPOLA VOTI */}
                    <button
                        className="button"
                        onClick={async () => {
                            const res = await fetch(
                                "https://mzcqosceyruvhzguvbcc.functions.supabase.co/functions/v1/seedVotes",
                                { method: "POST" }
                            );
                            const json = await res.json();
                            showSuccess(json.message || "Operazione completata");
                        }}
                    >
                        <i className="fa-solid fa-upload"></i>
                        <div className="button_content">
                            <span className="button_title">POPOLA</span>
                            <p className="button_description">Popola tabella voti</p>
                        </div>
                    </button>

                    {/* OVERRIDE VOTAZIONI (usa il VotingContext) */}
                    <button
                        className="button"
                        onClick={async () => {
                            try {
                                setTogglingOverride(true);
                                if (manualOpen) {
                                    await closeVotingNow(); // chiude override
                                    showSuccess("Votazioni disabilitate (override admin OFF)");
                                } else {
                                    await openVotingNow(); // apre override
                                    showSuccess("Votazioni abilitate (override admin ON)");
                                }
                            } catch (e: unknown) {
                                const msg = e instanceof Error ? e.message : String(e);
                                showError("Errore override: " + msg);
                            } finally {
                                setTogglingOverride(false);
                            }
                        }}
                        disabled={togglingOverride}
                    >
                        <i
                            className={`fa-solid ${manualOpen ? "fa-toggle-on" : "fa-toggle-off"}`}
                        />
                        <div className="button_content">
                            <span className="button_title">OVERRIDE</span>
                            <p className="button_description">
                                {manualOpen ? "Disabilita votazione" : "Abilita votazione"}
                            </p>
                        </div>
                    </button>

                    {/* SOCIAL STATUS */}
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
