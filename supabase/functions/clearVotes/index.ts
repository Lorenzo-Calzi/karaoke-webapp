// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async _req => {
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Elimina tutto da 'votes'
    const { error: votesError } = await supabase.from("votes").delete().neq("trackId", "");

    if (votesError) {
        return new Response(JSON.stringify({ error: votesError.message }), {
            status: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            }
        });
    }

    // Elimina tutto da 'songs'
    const { error: songsError } = await supabase.from("songs").delete().neq("trackId", "");

    if (songsError) {
        return new Response(JSON.stringify({ error: songsError.message }), {
            status: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            }
        });
    }

    return new Response(
        JSON.stringify({ message: "Tabelle votes e songs svuotate con successo." }),
        {
            status: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Content-Type": "application/json"
            }
        }
    );
});
