// Layout.tsx
import { useLocation, Outlet } from "react-router-dom";
import "./layout.scss";

function Layout() {
    const location = useLocation();

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
