import "./social.scss";

type SocialProfile = {
    username: string;
    profileImage: string;
    link: string;
    label?: string;
};

const profiles: SocialProfile[] = [
    {
        label: "La nostra pagina",
        username: "@karaoke_for_you",
        profileImage: "/images/karaoke_for_you_foto_profilo.png",
        link: "https://www.instagram.com/karaoke_for_you"
    },
    {
        label: "DJ",
        username: "@alex_delia_",
        profileImage: "/images/alex_foto_profilo.jpg",
        link: "https://www.instagram.com/alex_delia_/"
    },
    {
        label: "Staff",
        username: "@lorenzo_calzi",
        profileImage: "/images/lorenzo_foto_profilo.jpg",
        link: "https://www.instagram.com/lorenzo_calzi"
    },
    {
        username: "@michelegris",
        profileImage: "/images/michele_foto_profilo.jpg",
        link: "https://www.instagram.com/michelegris"
    },
    {
        username: "@loca.lizzato",
        profileImage: "/images/andrea_foto_profilo.jpg",
        link: "https://www.instagram.com/loca.lizzato"
    }
];

export default function Social() {
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
                            className="social_button"
                        >
                            <img
                                src={profile.profileImage}
                                alt={profile.username}
                                className="social_image"
                            />
                            <span className="social_username">{profile.username}</span>
                        </a>
                    </div>
                ))}
            </div>
        </div>
    );
}
