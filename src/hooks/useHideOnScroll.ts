import { useEffect, useState } from "react";

export function useHideOnScroll() {
    const [hidden, setHidden] = useState(false);
    let lastScroll = 0;

    useEffect(() => {
        const onScroll = () => {
            const current = window.scrollY;
            setHidden(current > lastScroll && current > 60);
            lastScroll = current;
        };

        window.addEventListener("scroll", onScroll);
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    return hidden;
}
