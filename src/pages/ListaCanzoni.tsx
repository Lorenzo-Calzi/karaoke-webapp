import "./listaCanzoni.scss";

export default function ListaCanzoni() {
    const songs = [
        {
            title: "Visiera a becco",
            singer: "Sfera Ebbasta",
            cover: "https://i.scdn.co/image/ab67616d0000b2730b5557811b1eab235b1fade4"
        },
        {
            title: "Ricchi per sempre",
            singer: "Sfera Ebbasta",
            cover: "https://i.scdn.co/image/ab67616d0000b273bdbb64093ef6f0582479ec8e"
        },
        {
            title: "Nuovo range",
            singer: "Rkomi, Sfera Ebbasta",
            cover: "https://i.scdn.co/image/ab67616d0000b27301161c81847e31dd1817926a"
        },
        {
            title: "Chic",
            singer: "Izi",
            cover: "https://i.scdn.co/image/ab67616d0000b273f0ff57a0f009979140cb49ae"
        },
        {
            title: "Davide",
            singer: "Gemitaiz",
            cover: "https://i.scdn.co/image/ab67616d0000b273b6b2c3f1cbd054fc697a53e3"
        },
        {
            title: "Brivido",
            singer: "Gué, Marracash",
            cover: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQdF51oPcSvMnTLbyplS9_PmQSqDDK11BZ_iw&s"
        },
        {
            title: "Tranne te",
            singer: "Fabri Fibra",
            cover: "https://i.scdn.co/image/ab67616d0000b2734810e64dc7b92d6693b0d55a"
        },
        {
            title: "Settimana bianca",
            singer: "Il Pagante",
            cover: "https://i.scdn.co/image/ab67616d0000b273ef32132e1bd4bbababcf23a1"
        },
        {
            title: "Mediterranea",
            singer: "Irama",
            cover: "https://i.scdn.co/image/ab67616d0000b273ef36b4357902f25a789c5588"
        },
        {
            title: "Domani ci passa",
            singer: "Ludwig",
            cover: "https://i.scdn.co/image/ab67616d0000b2735e88440b35c26fddb6ab39bd"
        },
        {
            title: "Dove e quando",
            singer: "Benji e Fede",
            cover: "https://i.scdn.co/image/ab67616d0000b2736dc213b2119b838bccf6e463"
        },
        {
            title: "Notti in bianco",
            singer: "BLANCO",
            cover: "https://i.scdn.co/image/ab67616d0000b2735880f9b11a2e6289f9db78d5"
        },
        {
            title: "Balorda nostalgia",
            singer: "Olly",
            cover: "https://i.scdn.co/image/ab67616d0000b27313d952d57ef460632cc0975f"
        },
        {
            title: "Guasto d’amore",
            singer: "Bresh",
            cover: "https://i.scdn.co/image/ab67616d0000b273fdcbf5d28fd6ab6d35c6411f"
        },
        {
            title: "La nuova stella di broadway",
            singer: "Cesare Cremonini",
            cover: "https://i.scdn.co/image/ab67616d0000b27322ae5b5ba67f6f218b5f3e34"
        },
        {
            title: "Come un pittore",
            singer: "Modà",
            cover: "https://i.scdn.co/image/ab67616d0000b273a1e13ebd7a4ffbb6c3af1390"
        },
        {
            title: "Ti scatterò una foto",
            singer: "Tiziano Ferro",
            cover: "https://i.scdn.co/image/ab67616d0000b273b1aaa7dc3b577778d7dfb421"
        },
        {
            title: "Per dimenticare",
            singer: "Zero Assoluto",
            cover: "https://i.scdn.co/image/ab67616d0000b273e414a48c533be40f6cc6cabe"
        },
        {
            title: "Pianeti",
            singer: "Ultimo",
            cover: "https://i.scdn.co/image/ab67616d0000b27368bf82a553744c54ee7a3efa"
        },
        {
            title: "La musica non c’è",
            singer: "Coez",
            cover: "https://i.scdn.co/image/ab67616d0000b27387f01b35a5806d46277a4316"
        },
        {
            title: "Più bella cosa",
            singer: "Eros Ramazzotti",
            cover: "https://i.scdn.co/image/ab67616d0000b2734400e3f5234b4d217fd48c85"
        },
        {
            title: "Tu si a fine du mundo",
            singer: "Angelo Famao",
            cover: "https://i.scdn.co/image/ab67616d0000b273b4fe188f97b90b34fff57f9c"
        },
        {
            title: "Bambola",
            singer: "Matteo Milazzo",
            cover: "https://i.scdn.co/image/ab67616d0000b273025ae1125a53daa447f94a01"
        },
        {
            title: "Rossetto e caffè",
            singer: "Sal Da Vinci",
            cover: "https://i.scdn.co/image/ab67616d00001e0222fcd711bb672944ffc67358"
        },
        {
            title: "Angela",
            singer: "Checco Zalone",
            cover: "https://i.scdn.co/image/ab67616d0000b2734d40ffa2c1ecf2f65316edd0"
        },
        {
            title: "Bailando",
            singer: "Enrique Iglesias",
            cover: "https://i.scdn.co/image/ab67616d0000b273189ac1cdbd5ffd4cfc98aabb"
        },
        {
            title: "Despacito",
            singer: "Luis Fonsi",
            cover: "https://i.scdn.co/image/ab67616d0000b273343bd0b686fe428dd9ab6d28"
        },
        {
            title: "I want it that way",
            singer: "Backstreet Boys",
            cover: "https://i.scdn.co/image/ab67616d0000b2732160c02bc56f192df0f4986b"
        },
        {
            title: "Whats my destiny dragon ball",
            singer: "Giorgio Vanni",
            cover: "https://i.scdn.co/image/ab67616d0000b273eda277eff19d4357f36b43f1"
        }
    ];

    return (
        <div className="listaCanzoni container">
            <div className="description">
                <h2 className="title">Lista delle canzoni consigliate</h2>
                <p>Non sai cosa cantare?</p>
                <p>Scorri i nostri consigli e scegli la tua hit.</p>
                <p>Quando hai deciso, vieni a prenotarti!</p>
            </div>

            <ul className="song_list">
                {songs.map((song, index) => (
                    <li key={index} className="song_item">
                        <img className="song_cover" src={song.cover} alt={song.title} />
                        <div className="song_info">
                            <span className="song_title">{song.title}</span>
                            <span className="song_singer">{song.singer}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
