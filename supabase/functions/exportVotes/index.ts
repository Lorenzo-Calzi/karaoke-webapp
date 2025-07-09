import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async _req => {
    const supabase = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { data, error } = await supabase
        .from("votes")
        .select("title, artist, voterId")
        .neq("voterId", "ADMIN");

    if (error || !data) {
        return new Response(JSON.stringify({ error: error?.message || "Nessun dato" }), {
            status: 500
        });
    }

    // Raggruppa per title+artist e conta
    const grouped = new Map<string, { title: string; artist: string; count: number }>();

    for (const row of data) {
        const key = `${row.title}__${row.artist}`;
        if (!grouped.has(key)) {
            grouped.set(key, { title: row.title, artist: row.artist, count: 1 });
        } else {
            grouped.get(key)!.count += 1;
        }
    }

    // Ordina per numero di voti decrescente
    const sortedRows = Array.from(grouped.values()).sort((a, b) => b.count - a.count);

    const separator = ";";
    const header = ["TITOLO", "ARTISTA", "CONTEGGIO"];

    const csvRows = sortedRows.map(row =>
        [row.title, row.artist, row.count]
            .map(field => `"${(field ?? "").toString().replace(/"/g, '""')}"`)
            .join(separator)
    );

    const today = new Date();
    const formattedFileDate = today.toLocaleDateString("it-IT").replace(/\//g, "_"); // es. 09_07_2025
    const csv = [header.join(separator), ...csvRows].join("\n");

    return new Response(csv, {
        headers: {
            "Content-Type": "text/csv; charset=utf-8",
            "Content-Disposition": `attachment; filename="${formattedFileDate}.csv"`
        }
    });
});
