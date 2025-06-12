import "./homepage.scss";
import { useNavigate } from "react-router-dom";

function Homepage() {
    const navigate = useNavigate();

    const handleClick = (path: string) => {
        setTimeout(() => {
            navigate(path);
        }, 200);
    };

    return (
        <div className="homepage container">
            <img className="logo" src="/images/karaoke_logo_3.png" alt="logo karaoke" />
            <div>
                <h3 className="title">È il tuo momento!</h3>
                <h3 className="title">Scegli un’opzione:</h3>
            </div>

            <div className="buttons_list">
                <button onClick={() => handleClick("/canzoni")}>
                    <i className="fa-solid fa-list-ul"></i>
                    <span>KARAOKE: i nostri consigli</span>
                </button>

                <button onClick={() => handleClick("/consigliaci")}>
                    <i className="fa-solid fa-lightbulb"></i>
                    <span>DJ SET: consiglia una canzone</span>
                </button>

                <button onClick={() => handleClick("/social")}>
                    <i className="fa-brands fa-instagram"></i>
                    <span>Social</span>
                </button>
            </div>
        </div>
    );
}

export default Homepage;
