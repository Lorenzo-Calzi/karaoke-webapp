import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PiMicrophoneStageFill } from "react-icons/pi";
import { IoHeadset } from "react-icons/io5";
import { AiFillInstagram } from "react-icons/ai";
import { IoCalendarNumber } from "react-icons/io5";
import "./homepage.scss";

function Homepage() {
    const navigate = useNavigate();
    const [clickedPath, setClickedPath] = useState<string | null>(null);
    const logoRef = useRef<HTMLImageElement>(null);
    const buttonsRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        const adjustLogoSize = () => {
            const buttonsHeight = buttonsRef.current?.offsetHeight ?? 0;

            const verticalPadding = 4 * 16;
            const gap = 3 * 16;
            const verticalMargin = verticalPadding + gap;

            const orizzontalMargin = window.innerWidth * 0.15;
            const containerWidth = window.innerWidth - orizzontalMargin;
            const maxWidth = containerWidth - containerWidth * 0.3;

            const availableHeight = window.innerHeight - buttonsHeight - verticalMargin;
            const availableWidth = maxWidth;

            if (logoRef.current) {
                if (availableWidth > availableHeight) {
                    logoRef.current.style.height = `${availableHeight}px`;
                    logoRef.current.style.width = `${availableHeight}px`;
                } else {
                    logoRef.current.style.height = `${availableWidth}px`;
                    logoRef.current.style.width = `${availableWidth}px`;
                }
            }
        };

        adjustLogoSize();
        window.addEventListener("resize", adjustLogoSize);
        return () => window.removeEventListener("resize", adjustLogoSize);
    }, []);

    return (
        <div className="homepage container">
            <div ref={logoRef} className="logo"></div>
            {/* <img ref={logoRef} className="logo" src="/images/karaoke_logo.png" alt="logo karaoke" /> */}

            <div ref={buttonsRef} className="buttons_list">
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
