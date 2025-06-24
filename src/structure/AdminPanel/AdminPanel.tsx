import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import "./adminPanel.scss";

const ADMIN_EMAIL = "lorenzocalzi@gmail.com";

export default function AdminPanel() {
    const [email, setEmail] = useState("");
    const [session, setSession] = useState<any>(null);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            const email = data.session?.user?.email;
            if (email === ADMIN_EMAIL) {
                localStorage.setItem("isAdmin", "true");
            }
        });

        supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            const email = session?.user?.email;
            if (email === ADMIN_EMAIL) {
                localStorage.setItem("isAdmin", "true");
            }
        });
    }, []);

    const handleLogin = async () => {
        if (!email) return;
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) alert("Errore login: " + error.message);
        else alert("Controlla la tua email per il link di accesso");
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
    } else if (session.user.email !== ADMIN_EMAIL) {
        content = <p className="text-red-500">Accesso non autorizzato</p>;
    } else {
        content = (
            <>
                <h2 className="title">Accesso amministratore confermato</h2>
                <p className="paragraph">Hai accesso illimitato alla piattaforma.</p>
            </>
        );
    }

    return <div className="adminPanel container">{content}</div>;
}
