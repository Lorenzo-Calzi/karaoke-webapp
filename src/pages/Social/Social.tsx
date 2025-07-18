import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import "./social.scss";

type SocialProfile = {
    id: string;
    username: string;
    profile_image: string;
    link: string;
    label?: string;
    on_air: boolean;
    force_blue: boolean;
};

export default function Social() {
    const [profiles, setProfiles] = useState<SocialProfile[]>([]);

    useEffect(() => {
        const fetchProfiles = async () => {
            const { data, error } = await supabase
                .from("social_profiles")
                .select("*")
                .order("order", { ascending: true });

            if (error) {
                console.error("Errore nel fetch dei profili:", error);
                return;
            }

            setProfiles(data as SocialProfile[]);
        };

        fetchProfiles();
    }, []);

    return (
        <div className="social container">
            <h2 className="title">Seguici sui Social</h2>
            <div className="social_list">
                {profiles.map((profile, index) => (
                    <div key={index}>
                        {profile.label && <p className="social_section_label">{profile.label}</p>}
                        <a
                            href={profile.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="button"
                        >
                            <img
                                src={profile.profile_image}
                                alt={profile.username}
                                className="social_image"
                            />
                            <span className="social_username">{profile.username}</span>

                            <div
                                className="on_air"
                                style={{
                                    backgroundColor: profile.force_blue
                                        ? "#3f95e0"
                                        : profile.on_air
                                        ? "rgb(62, 194, 99)"
                                        : "rgb(220, 20, 60)",
                                    color: profile.force_blue
                                        ? "#3f95e0"
                                        : profile.on_air
                                        ? "rgb(62, 194, 99)"
                                        : "rgb(220, 20, 60)"
                                }}
                            ></div>
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}
