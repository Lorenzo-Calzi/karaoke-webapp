import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// @ts-ignore
const url = Deno.env.get("URL")!;
// @ts-ignore
const key = Deno.env.get("KEY")!;

serve(async () => {
    const supabase = createClient(url, key);
    const { error } = await supabase.from("votes").delete().neq("id", -1);

    if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }

    return new Response(JSON.stringify({ message: "Tabella voti svuotata" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
    });
});
