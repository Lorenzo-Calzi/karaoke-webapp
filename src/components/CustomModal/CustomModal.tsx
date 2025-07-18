import { useEffect, useState } from "react";
import "./customModal.scss";

interface CustomModalProps {
    title?: string;
    description: string;
    onPrimaryAction: () => void;
    show: boolean;
    onClose: () => void;
    showSecondaryButton?: boolean;
}

const CustomModal = ({
    title = "Attenzione",
    description,
    onPrimaryAction,
    show,
    onClose,
    showSecondaryButton = false
}: CustomModalProps) => {
    const [countdown, setCountdown] = useState(5);

    useEffect(() => {
        if (!show) return;

        document.body.style.overflow = "hidden";

        const timer = setInterval(() => {
            setCountdown(c => {
                if (c <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return c - 1;
            });
        }, 1000);

        return () => {
            clearInterval(timer);
            document.body.style.overflow = "auto";
            setCountdown(5);
        };
    }, [show]);

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
                    disabled={countdown > 0}
                    style={{
                        backgroundColor: countdown > 0 ? "#ccc" : "#007bff",
                        cursor: countdown > 0 ? "not-allowed" : "pointer"
                    }}
                >
                    <p className="paragraph">
                        {countdown > 0 ? `Attendi ${countdown}s` : "Continua"}
                    </p>
                </button>

                {showSecondaryButton && (
                    <button
                        onClick={onClose}
                        disabled={countdown > 0}
                        style={{
                            backgroundColor: countdown > 0 ? "#ccc" : "#007bff2f",
                            cursor: countdown > 0 ? "not-allowed" : "pointer"
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
