import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { PiMicrophoneStageFill } from "react-icons/pi";
import { IoHeadset } from "react-icons/io5";
import { AiFillInstagram } from "react-icons/ai";
import { IoCalendarNumber } from "react-icons/io5";
import { RiAdminFill } from "react-icons/ri";
import { BsMusicNoteList } from "react-icons/bs";
import "./homepage.scss";

function Homepage() {
    const navigate = useNavigate();
    const [clickedPath, setClickedPath] = useState<string | null>(null);
    const logoRef = useRef<HTMLImageElement>(null);
    const buttonsRef = useRef<HTMLDivElement>(null);
    const { session } = useAdmin();
    const isAdmin = !!session;
    const isSuperadmin = session?.isSuperadmin;

    const handleClick = (path: string) => {
        setClickedPath(path);

        setTimeout(() => {
            navigate(path);
            setClickedPath(null); // reset stato
        }, 150);
    };

    useEffect(() => {
        const adjustLogoSize = () => {
            if (!logoRef.current || !buttonsRef.current) return;

            const verticalPadding = 4 * 16;
            const gap = 3 * 16;
            const verticalMargin = verticalPadding + gap;

            const orizzontalMargin = window.innerWidth * 0.15;
            const containerWidth = window.innerWidth - orizzontalMargin;
            const containerContent = containerWidth - containerWidth * 0.3;
            const maxWidth = 420;

            const buttonsHeight = buttonsRef.current.offsetHeight;
            const availableHeight = window.innerHeight - buttonsHeight - verticalMargin;
            const availableWidth = containerContent < maxWidth ? containerContent : maxWidth;

            const finalSize = Math.min(availableHeight, availableWidth);

            logoRef.current.style.width = `${finalSize}px`;
            logoRef.current.style.height = `${finalSize}px`;
        };

        // Esegui al primo render (ma solo dopo che isAdmin è pronto)
        const timeout = setTimeout(adjustLogoSize, 0);

        // Esegui anche al resize
        window.addEventListener("resize", adjustLogoSize);
        return () => {
            clearTimeout(timeout);
            window.removeEventListener("resize", adjustLogoSize);
        };
    }, [isAdmin, isSuperadmin]);

    return (
        <div className="homepage container">
            <div ref={logoRef} className="logo"></div>

            <div ref={buttonsRef} className="buttons_list">
                <button
                    className={`button ${clickedPath === "/karaoke" ? "clicked" : ""}`}
                    onClick={() => handleClick("/karaoke")}
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
                >
                    <IoCalendarNumber />

                    <div className="button_content">
                        <span className="button_title">CALENDARIO</span>
                        <p className="button_description">Le nostre date</p>
                    </div>
                </button>

                {isSuperadmin && (
                    <button
                        className={`button ${clickedPath === "/admin" ? "clicked" : ""}`}
                        onClick={() => handleClick("/admin")}
                    >
                        <RiAdminFill />

                        <div className="button_content">
                            <span className="button_title">ADMIN</span>
                            <p className="button_description">Amministra il sito</p>
                        </div>
                    </button>
                )}
                {isAdmin && (
                    <button
                        className={`button ${
                            clickedPath === "/admin/karaokeList" ? "clicked" : ""
                        }`}
                        onClick={() => handleClick("/admin/karaokeList")}
                    >
                        <BsMusicNoteList />

                        <div className="button_content">
                            <span className="button_title">LISTA</span>
                            <p className="button_description">Gestisci la lista</p>
                        </div>
                    </button>
                )}
            </div>
        </div>
    );
}

export default Homepage;
