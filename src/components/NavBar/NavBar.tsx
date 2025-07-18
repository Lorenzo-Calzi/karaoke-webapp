import { Link, useLocation } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { useHideOnScroll } from "../../hooks/useHideOnScroll";
import { HiHome } from "react-icons/hi2";
import { PiMicrophoneStageFill } from "react-icons/pi";
import { IoHeadset } from "react-icons/io5";
import { AiFillInstagram } from "react-icons/ai";
import { IoCalendarNumber } from "react-icons/io5";
import { RiAdminFill } from "react-icons/ri";
import { BsMusicNoteList } from "react-icons/bs";
import "./navBar.scss";

interface NavItem {
    path: string;
    iconComponent: React.ReactElement;
    label: string;
}

export default function NavBar() {
    const location = useLocation();
    const currentPath = location.pathname;
    const isHidden = useHideOnScroll();

    if (currentPath === "/") return null;

    const { session } = useAdmin();
    const isAdmin = !!session;
    const isSuperadmin = session?.isSuperadmin;

    const navItems: NavItem[] = [
        { path: "/", iconComponent: <HiHome />, label: "Home" },
        { path: "/karaoke", iconComponent: <PiMicrophoneStageFill />, label: "Karaoke" },
        { path: "/djset", iconComponent: <IoHeadset />, label: "DJ Set" },
        { path: "/social", iconComponent: <AiFillInstagram />, label: "Social" },
        { path: "/calendario", iconComponent: <IoCalendarNumber />, label: "Calendario" }
    ];

    if (isSuperadmin) {
        navItems.push({
            path: "/admin",
            iconComponent: <RiAdminFill />,
            label: "Admin"
        });
    }

    if (isAdmin) {
        navItems.push({
            path: "/admin/karaokeList",
            iconComponent: <BsMusicNoteList />,
            label: "Admin"
        });
    }

    return (
        <nav className={`bottom-navbar ${isHidden ? "hide" : ""}`}>
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
