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
            <img className="logo" src="/images/karaoke_logo_4.png" alt="logo karaoke" />
            {/* <div>
                <h3 className="title">È il tuo momento!</h3>
                <h3 className="title">Scegli un’opzione:</h3>
            </div> */}

            {/* <div className="glitch-wrapper">
                <div className="glitch" data-glitch="DJ SET">
                    DJ SET
                </div>
                <div className="glitch" data-glitch="&">
                    &
                </div>
                <div className="glitch" data-glitch="KARAOKE">
                    KARAOKE
                </div>
            </div> */}

            <div className="buttons_list">
                <button onClick={() => handleClick("/canzoni")}>
                    <i className="fa-solid fa-list-ul"></i>

                    <div className="button_content">
                        <span className="button_title">KARAOKE</span>
                        <p className="button_description">Le canzoni che ti consigliamo</p>
                    </div>
                </button>

                <button onClick={() => handleClick("/consigliaci")}>
                    <i className="fa-solid fa-lightbulb"></i>

                    <div className="button_content">
                        <span className="button_title">DJ SET</span>
                        <p className="button_description">Vota le canzoni che vuoi ballare</p>
                    </div>
                </button>

                <button onClick={() => handleClick("/social")}>
                    <i className="fa-brands fa-instagram"></i>

                    <div className="button_content">
                        <span className="button_title">SOCIAL</span>
                        <p className="button_description">I nostri profili Instagram</p>
                    </div>
                </button>
            </div>
        </div>
    );
}

export default Homepage;
