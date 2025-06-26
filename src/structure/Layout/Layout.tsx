import { useLocation, Outlet } from "react-router-dom";
import "./layout.scss";

function Layout() {
    const location = useLocation();

    const getBgClass = () => {
        const path = location.pathname;
        if (path === "/") {
            return "bg-static";
        } else {
            return "bg-gradient";
        }
    };

    return (
        <div className={getBgClass()}>
            <Outlet />
        </div>
    );
}

export default Layout;
