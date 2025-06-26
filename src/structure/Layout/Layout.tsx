// import { useState } from "react";
import { useLocation, Outlet } from "react-router-dom";
// import SideBar from "../../components/SideBar/SideBar";
// import { RiMenu2Fill } from "react-icons/ri";
import "./layout.scss";

function Layout() {
    // const [sidebarOpen, setSidebarOpen] = useState(false);
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
            {/* {location.pathname !== "/" && (
                <RiMenu2Fill
                    className="hamburger"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="Apri menu"
                />
            )} */}

            {/* <SideBar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} /> */}
            <Outlet />
        </div>
    );
}

export default Layout;
