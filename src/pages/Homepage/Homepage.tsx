import { useNavigate } from "react-router-dom";
import "./homepage.scss";

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

            <div className="buttons_list">
                <button className="button" onClick={() => handleClick("/karaoke")}>
                    <i className="fa-solid fa-list-ul"></i>

                    <div className="button_content">
                        <span className="button_title">KARAOKE</span>
                        <p className="button_description">Le canzoni che ti consigliamo</p>
                    </div>
                </button>

                <button className="button" onClick={() => handleClick("/djset")}>
                    <i className="fa-solid fa-lightbulb"></i>

                    <div className="button_content">
                        <span className="button_title">DJ SET</span>
                        <p className="button_description">Vota le canzoni che vuoi ballare</p>
                    </div>
                </button>

                <button className="button" onClick={() => handleClick("/social")}>
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
