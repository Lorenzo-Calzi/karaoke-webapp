import { Link, useLocation } from "react-router-dom";
import { HiHome } from "react-icons/hi2";
import { PiMicrophoneStageFill } from "react-icons/pi";
import { IoHeadset } from "react-icons/io5";
import { AiFillInstagram } from "react-icons/ai";
import { RiAdminFill } from "react-icons/ri";
import "./NavBar.scss";

interface NavItem {
    path: string;
    iconComponent: React.ReactElement;
    label: string;
}

export default function NavBar() {
    const location = useLocation();
    const currentPath = location.pathname;

    if (currentPath === "/") return null;

    const isAdmin = localStorage.getItem("isAdmin") === "true";

    const navItems: NavItem[] = [
        { path: "/", iconComponent: <HiHome />, label: "Home" },
        { path: "/karaoke", iconComponent: <PiMicrophoneStageFill />, label: "Karaoke" },
        { path: "/djset", iconComponent: <IoHeadset />, label: "DJ Set" },
        { path: "/social", iconComponent: <AiFillInstagram />, label: "Social" }
    ];

    if (isAdmin) {
        navItems.push({
            path: "/admin",
            iconComponent: <RiAdminFill />,
            label: "Admin"
        });
    }

    return (
        <nav className="bottom-navbar">
            {navItems.map(({ path, iconComponent, label }) => (
                <Link
                    key={path}
                    to={path}
                    className={`nav-icon ${currentPath === path ? "active" : ""}`}
                    title={label}
                >
                    {iconComponent}
                </Link>
            ))}
        </nav>
    );
}
