import "./homepage.scss";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

function Homepage() {
    const navigate = useNavigate();
    const [clickedBtn, setClickedBtn] = useState<string | null>(null);

    const handleClick = (path: string, key: string) => {
        setClickedBtn(key);

        setTimeout(() => {
            setClickedBtn(null);
        }, 150);

        setTimeout(() => {
            navigate(path);
        }, 200);
    };

    useEffect(() => {
        setClickedBtn(null);
    }, []);

    return (
        <div className="homepage container">
            <img className="logo" src="/images/karaoke_logo_3.png" alt="logo karaoke" />
            <div>
                <h3 className="title">È il tuo momento!</h3>
                <h3 className="title">Scegli un’opzione:</h3>
            </div>

            <div className="buttons_list">
                <button
                    className={clickedBtn === "canzoni" ? "clicked" : ""}
                    onClick={() => handleClick("/canzoni", "canzoni")}
                >
                    <i className="fa-solid fa-list-ul"></i>
                    <span>KARAOKE: i nostri consigli</span>
                </button>

                <button
                    className={clickedBtn === "consigliaci" ? "clicked" : ""}
                    onClick={() => handleClick("/consigliaci", "consigliaci")}
                >
                    <i className="fa-solid fa-lightbulb"></i>
                    <span>DJ SET: consiglia una canzone</span>
                </button>

                <button
                    className={clickedBtn === "social" ? "clicked" : ""}
                    onClick={() => handleClick("/social", "social")}
                >
                    <i className="fa-brands fa-instagram"></i>
                    <span>Social</span>
                </button>
            </div>
        </div>
    );
}

export default Homepage;
