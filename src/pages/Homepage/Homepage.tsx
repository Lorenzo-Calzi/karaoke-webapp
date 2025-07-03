import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PiMicrophoneStageFill } from "react-icons/pi";
import { IoHeadset } from "react-icons/io5";
import { AiFillInstagram } from "react-icons/ai";
import { IoCalendarNumber } from "react-icons/io5";
import "./homepage.scss";

function Homepage() {
    const navigate = useNavigate();
    const [clickedPath, setClickedPath] = useState<string | null>(null);

    const handleClick = (path: string) => {
        setClickedPath(path);
    };

    const handleTransitionEnd = (e: React.TransitionEvent<HTMLButtonElement>) => {
        if (e.target !== e.currentTarget) return;

        if (clickedPath) {
            navigate(clickedPath);
            setClickedPath(null);
        }
    };

    return (
        <div className="homepage container">
            <img className="logo" src="/images/karaoke_logo.png" alt="logo karaoke" />

            <div className="buttons_list">
                <button
                    className={`button ${clickedPath === "/karaoke" ? "clicked" : ""}`}
                    onClick={() => handleClick("/karaoke")}
                    onTransitionEnd={handleTransitionEnd}
                >
                    <PiMicrophoneStageFill />

                    <div className="button_content">
                        <span className="button_title">KARAOKE</span>
                        <p className="button_description">Le canzoni che ti consigliamo</p>
                    </div>
                </button>

                <button
                    className={`button ${clickedPath === "/djset" ? "clicked" : ""}`}
                    onClick={() => handleClick("/djset")}
                    onTransitionEnd={handleTransitionEnd}
                >
                    <IoHeadset />

                    <div className="button_content">
                        <span className="button_title">DJ SET</span>
                        <p className="button_description">Vota le canzoni che vuoi ballare</p>
                    </div>
                </button>

                <button
                    className={`button ${clickedPath === "/social" ? "clicked" : ""}`}
                    onClick={() => handleClick("/social")}
                    onTransitionEnd={handleTransitionEnd}
                >
                    <AiFillInstagram />

                    <div className="button_content">
                        <span className="button_title">SOCIAL</span>
                        <p className="button_description">I nostri profili Instagram</p>
                    </div>
                </button>

                <button
                    className={`button ${clickedPath === "/calendario" ? "clicked" : ""}`}
                    onClick={() => handleClick("/calendario")}
                    onTransitionEnd={handleTransitionEnd}
                >
                    <IoCalendarNumber />

                    <div className="button_content">
                        <span className="button_title">CALENDARIO</span>
                        <p className="button_description">Le nostre date</p>
                    </div>
                </button>
            </div>
        </div>
    );
}

export default Homepage;
