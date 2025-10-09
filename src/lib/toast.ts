import { toast } from "react-toastify";

export const showSuccess = (message: string) =>
    toast.success(message, {
        position: "top-center",
        autoClose: 1000
    });

export const showError = (message: string) =>
    toast.error(message, {
        position: "top-center",
        autoClose: 1000
    });

export const showInfo = (message: string) =>
    toast.info(message, {
        position: "top-center",
        autoClose: 1000
    });

export const showWarning = (message: string) =>
    toast.warn(message, {
        position: "top-center",
        autoClose: 1000
    });
