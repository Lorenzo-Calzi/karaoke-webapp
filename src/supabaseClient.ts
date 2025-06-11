import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://mzcqosceyruvhzguvbcc.supabase.co";
const supabaseAnonKey =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16Y3Fvc2NleXJ1dmh6Z3V2YmNjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0NzIyMDUsImV4cCI6MjA2NTA0ODIwNX0.MVYAme4Rxqdjk2hWTQiTg2Bd5PsRhlsuyCueSHZHBYk";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
