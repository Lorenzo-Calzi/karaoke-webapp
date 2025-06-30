import { useEffect, useState } from "react";
import "./votoProgressivo.scss";

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
        const timeout = setTimeout(() => setOffset(nuovoOffset));
        return () => clearTimeout(timeout);
    }, [percentuale]);

    useEffect(() => {
        if (valore === 0) {
            const delay = setTimeout(() => setColor("#ddd"), 150);
            return () => clearTimeout(delay);
        } else {
            setColor("#ff2f40");
        }
    }, [valore]);

    return (
        <div className="voto_progressivo_container">
            <svg>
                <circle cx="50" cy="50" r="45" className="inner_circle" />
                <circle
                    className="outer_circle"
                    cx="50"
                    cy="50"
                    r="45"
                    stroke={color}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={offset}
                    transform="rotate(-90 50 50)"
                />
            </svg>
            <p>
                {valore}/{massimo}
            </p>
        </div>
    );
}
