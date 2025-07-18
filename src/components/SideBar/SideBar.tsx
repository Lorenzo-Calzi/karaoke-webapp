import { Link, useLocation } from "react-router-dom";
import { useAdmin } from "../../context/AdminContext";
import { HiHome } from "react-icons/hi2";
import { PiMicrophoneStageFill } from "react-icons/pi";
import { IoHeadset } from "react-icons/io5";
import { AiFillInstagram } from "react-icons/ai";
import { RiAdminFill } from "react-icons/ri";
import "./sideBar.scss";

interface Props {
    isOpen: boolean;
    onClose: () => void;
}

interface NavItem {
    path: string;
    iconComponent: React.ReactElement;
    label: string;
}

export default function Sidebar({ isOpen, onClose }: Props) {
    const location = useLocation();
    const currentPath = location.pathname;

    if (currentPath === "/") return null;

    const { session } = useAdmin();
    const isAdmin = !!session;

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
        <div className={`sidebar ${isOpen ? "open" : ""}`} onClick={onClose}>
            <div className="sidebar-content" onClick={e => e.stopPropagation()}>
                <nav>
                    {navItems.map(({ path, iconComponent, label }) => (
                        <Link
                            key={path}
                            to={path}
                            className={`nav-item ${currentPath === path ? "active" : ""}`}
                            title={label}
                            onClick={onClose}
                        >
                            {iconComponent}
                            <p className="paragraph">{label}</p>
                        </Link>
                    ))}
                </nav>
            </div>
        </div>
    );
}
