import { useEffect, useState } from "react";

type VotoProgressivoProps = {
    valore: number;
    massimo?: number;
};

export default function VotoProgressivo({ valore, massimo = 3 }: VotoProgressivoProps) {
    const percentuale = (valore / massimo) * 100;
    const strokeDasharray = 283;

    const [offset, setOffset] = useState(strokeDasharray);
    const [color, setColor] = useState<string>("#ddd");

    useEffect(() => {
        const nuovoOffset = strokeDasharray - (percentuale / 100) * strokeDasharray;
        const timeout = setTimeout(() => setOffset(nuovoOffset), 50);
        return () => clearTimeout(timeout);
    }, [percentuale]);

    useEffect(() => {
        if (valore === 0) {
            const delay = setTimeout(() => setColor("#ddd"), 400);
            return () => clearTimeout(delay);
        } else {
            setColor("#ff2f40");
        }
    }, [valore]);

    return (
        <div style={{ width: "100px", height: "100px", position: "relative", margin: "auto" }}>
            <svg width="100" height="100">
                <circle cx="50" cy="50" r="45" stroke="#eee" strokeWidth="10" fill="transparent" />
                <circle
                    cx="50"
                    cy="50"
                    r="45"
                    stroke={color}
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={offset}
                    transform="rotate(-90 50 50)"
                    style={{
                        transition: "stroke-dashoffset 0.4s ease"
                    }}
                />
            </svg>
            <div
                style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    fontWeight: "bold",
                    fontSize: "18px",
                    fontFamily: "Orbitron, sans-serif"
                }}
            >
                {valore}/{massimo}
            </div>
        </div>
    );
}
