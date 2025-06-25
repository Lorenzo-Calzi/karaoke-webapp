import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { json2csv } from "https://esm.sh/json-2-csv";

// @ts-ignore
const url = Deno.env.get("URL")!;
// @ts-ignore
const key = Deno.env.get("KEY")!;

serve(async _req => {
    try {
        const supabase = createClient(url, key);

        const { data, error } = await supabase.from("votes").select("*");

        if (error) {
            console.error("Errore Supabase:", error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        const csv = await json2csv(data);

        return new Response(csv, {
            status: 200,
            headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": 'attachment; filename="votes_export.csv"'
            }
        });
    } catch (err) {
        console.error("Errore generale:", err);
        return new Response(JSON.stringify({ error: "Errore interno", detail: String(err) }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
});
