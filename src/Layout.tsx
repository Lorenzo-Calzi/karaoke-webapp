import { useEffect } from "react";
import { useLocation, Outlet } from "react-router-dom";
import "./layout.scss";

function Layout() {
    const location = useLocation();

    useEffect(() => {
        const setVh = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty("--vh", `${vh}px`);
        };
        setVh();
        window.addEventListener("resize", setVh);
        return () => window.removeEventListener("resize", setVh);
    }, []);

    const getBgClass = () => {
        const path = location.pathname;
        if (path === "/canzoni" || path === "/consigliaci") {
            return "bg-gradient";
        } else {
            return "bg-static";
        }
    };

    return (
        <div className={getBgClass()}>
            <Outlet />
        </div>
    );
}

export default Layout;
