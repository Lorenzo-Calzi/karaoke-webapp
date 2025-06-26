import { useEffect, useState } from "react";

export function useHideOnScroll() {
    const [hidden, setHidden] = useState(false);
    let lastScroll = 0;

    useEffect(() => {
        const handleScroll = () => {
            const current = window.scrollY;
            const scrollHeight = document.documentElement.scrollHeight;
            const windowHeight = window.innerHeight;

            const isAtBottom = current + windowHeight >= scrollHeight - 10; // tolleranza

            // Nascondi se si scrolla in basso o siamo a fondo pagina
            if ((current > lastScroll && current > 60) || isAtBottom) {
                setHidden(true);
            } else {
                setHidden(false);
            }

            lastScroll = current;
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return hidden;
}
