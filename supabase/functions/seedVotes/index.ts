// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async req => {
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const votes = [
        {
            trackId: "2tTmW7RDtMQtBk7m2rYeSw",
            title: "Quevedo: Bzrp Music Sessions, Vol. 52",
            artist: "Bizarrap",
            voterId: "ADMIN",
            artworkUrl100: "https://i.scdn.co/image/ab67616d00001e021630dd349221a35ce03a0ccf"
        },
        {
            trackId: "5fwSHlTEWpluwOM0Sxnh5k",
            title: "Pepas",
            artist: "Farruko",
            voterId: "ADMIN",
            artworkUrl100: "https://i.scdn.co/image/ab67616d00001e024239a6aa89738d8f798168ad"
        },
        {
            trackId: "0pBMFlAy7mQeUMQKaN4y8x",
            title: "Sexy Bitch (feat. Akon)",
            artist: "David Guetta",
            voterId: "ADMIN",
            artworkUrl100: "https://i.scdn.co/image/ab67616d00001e02444d1ba6cd088e28bccee374"
        },
        {
            trackId: "0rCxlp7KdpW1JR8uG6Uno0",
            title: "Danza Kuduro",
            artist: "Lucenzo",
            voterId: "ADMIN",
            artworkUrl100: "https://i.scdn.co/image/ab67616d00001e02e735b1d6f3b7d27654794d44"
        },
        {
            trackId: "2Up8QSKRV7WnZxZAQasEUq",
            title: "Mediterranea",
            artist: "Irama",
            voterId: "ADMIN",
            artworkUrl100: "https://i.scdn.co/image/ab67616d00001e02ef36b4357902f25a789c5588"
        },
        {
            trackId: "1IHWl5LamUGEuP4ozKQSXZ",
            title: "Tití Me Preguntó",
            artist: "Bad Bunny",
            voterId: "ADMIN",
            artworkUrl100: "https://i.scdn.co/image/ab67616d00001e0249d694203245f241a1bcaa72"
        },
        {
            trackId: "6Lc0La3OwOmAouQjbID4uX",
            title: "Nera",
            artist: "Irama",
            voterId: "ADMIN",
            artworkUrl100: "https://i.scdn.co/image/ab67616d00001e02a6f221182f3372804a24a901"
        },
        {
            trackId: "6XjDF6nds4DE2BBbagZol6",
            title: "Gata Only",
            artist: "FloyyMenor",
            voterId: "ADMIN",
            artworkUrl100: "https://i.scdn.co/image/ab67616d00001e02c4583f3ad76630879a75450a"
        },
        {
            trackId: "3elLXGwE5zaREuOzWdlRJ2",
            title: "Domani ci passa",
            artist: "Ludwig",
            voterId: "ADMIN",
            artworkUrl100: "https://i.scdn.co/image/ab67616d00001e025e88440b35c26fddb6ab39bd"
        },
        {
            trackId: "5YoITs1m0q8UOQ4AW7N5ga",
            title: "Gasolina",
            artist: "Daddy Yankee",
            voterId: "ADMIN",
            artworkUrl100: "https://i.scdn.co/image/ab67616d00001e0211b9999b620ef9bc0e957623"
        },
        {
            trackId: "7sj9VfVtmcEZBDbRAsVXWY",
            title: "TT LE GIRLZ (feat. Niky Savage)",
            artist: "ANNA",
            voterId: "ADMIN",
            artworkUrl100: "https://i.scdn.co/image/ab67616d00001e02fb7329a6fb6154b1fa3704c7"
        },
        {
            trackId: "19LRRuiMQ8a9jhqSf8jVip",
            title: "El Party",
            artist: "Jake La Furia",
            voterId: "ADMIN",
            artworkUrl100: "https://i.scdn.co/image/ab67616d00001e02657757917e6b3c5701b0138b"
        },
        {
            trackId: "5KTZgG84bKFGm53lhLtTqc",
            title: "Mwaki",
            artist: "Zerb",
            voterId: "ADMIN",
            artworkUrl100: "https://i.scdn.co/image/ab67616d00001e02f558c1088e54800f86fe2cf3"
        },
        {
            trackId: "7Cw97917dvg5xm6XMAA4Y2",
            title: "Happy Birthday",
            artist: "Sfera Ebbasta",
            voterId: "ADMIN",
            artworkUrl100: "https://i.scdn.co/image/ab67616d00001e02ad8b8c84e456d13f03a5fc7d"
        },
        {
            trackId: "6cJLfIqwh0tCKRjYM3WpZ5",
            title: "Darte un Beso",
            artist: "Prince Royce",
            voterId: "ADMIN",
            artworkUrl100: "https://i.scdn.co/image/ab67616d00001e029698eca2303d9c50b8974064"
        },
        {
            trackId: "5Hijdt7rmbj9fUJdXEs6Nz",
            title: "(It Goes Like) Nanana",
            artist: "Peggy Gou",
            voterId: "ADMIN",
            artworkUrl100: "https://i.scdn.co/image/ab67616d00001e02a658ab0f60cc249da0b97de5"
        }
    ];

    // Inserisci i voti
    const { error: voteError } = await supabase.from("votes").insert(votes);
    if (voteError) {
        return new Response(JSON.stringify({ error: voteError.message }), {
            status: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            }
        });
    }

    // Inserisci le canzoni in 'songs' (senza duplicati)
    const songs = votes.map(v => ({
        trackId: v.trackId,
        title: v.title,
        artist: v.artist,
        artworkUrl100: v.artworkUrl100,
        played: false
    }));

    const { error: songError, data: songData } = await supabase.from("songs").upsert(songs);

    if (songError) {
        console.error("Errore inserimento songs:", songError.message);
        return new Response(JSON.stringify({ error: songError.message }), {
            status: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            }
        });
    }

    return new Response(JSON.stringify({ message: "Voti e canzoni inseriti correttamente." }), {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Content-Type": "application/json"
        }
    });
});
