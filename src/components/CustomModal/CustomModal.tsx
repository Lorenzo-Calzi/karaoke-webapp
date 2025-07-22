import { useEffect, useState } from "react";
import "./customModal.scss";

interface CustomModalProps {
    title?: string;
    description: string;
    onPrimaryAction: () => void;
    show: boolean;
    onClose: () => void;
    showSecondaryButton?: boolean;
    timer?: boolean;
}

const CustomModal = ({
    title = "Attenzione",
    description,
    onPrimaryAction,
    show,
    onClose,
    showSecondaryButton = false,
    timer = true
}: CustomModalProps) => {
    const [countdown, setCountdown] = useState(3);

    useEffect(() => {
        if (!show || !timer) return;

        document.body.style.overflow = "hidden";

        const interval = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return c - 1;
            });
        }, 1000);

        return () => {
            clearInterval(interval);
            document.body.style.overflow = "auto";
            setCountdown(3); // reset
        };
    }, [show, timer]);

    if (!show) return null;

    return (
        <div className={`custom-modal-container ${show ? "show" : "hide"}`}>
            <div className="custom-modal">
                <h2 className="title" style={{ color: "#c00" }}>
                    {title}
                </h2>
                <p className="paragraph" style={{ color: "black" }}>
                    {description}
                </p>
                <button
                    onClick={() => {
                        onPrimaryAction();
                        onClose();
                    }}
                    disabled={timer && countdown > 0}
                    style={{
                        backgroundColor: timer && countdown > 0 ? "#ccc" : "#007bff",
                        cursor: timer && countdown > 0 ? "not-allowed" : "pointer"
                    }}
                >
                    <p className="paragraph" style={{ fontWeight: 900 }}>
                        {timer && countdown > 0 ? `Attendi ${countdown}s` : "Continua"}
                    </p>
                </button>

                {showSecondaryButton && (
                    <button
                        onClick={onClose}
                        disabled={timer && countdown > 0}
                        style={{
                            backgroundColor: timer && countdown > 0 ? "#ccc" : "#007bff2f",
                            cursor: timer && countdown > 0 ? "not-allowed" : "pointer"
                        }}
                    >
                        <p className="paragraph" style={{ color: "#007bff" }}>
                            Chiudi
                        </p>
                    </button>
                )}
            </div>
        </div>
    );
};

export default CustomModal;
