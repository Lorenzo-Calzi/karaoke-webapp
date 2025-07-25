import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { VotingProvider } from "../context/VotingContext";
import { AdminProvider } from "../context/AdminContext";
import ScrollToTop from "./ScrollToTop";
import NavBar from "../components/NavBar/NavBar";
import Layout from "./Layout/Layout";
import AdminPanel from "../pages/AdminPanel/AdminPanel";
import KaraokeList from "../pages/KaraokeList/KaraokeList";
import Homepage from "../pages/Homepage/Homepage";
import ListaCanzoni from "../pages/ListaCanzoni/ListaCanzoni";
import ConsigliaUnaCanzone from "../pages/ConsigliaUnaCanzone/ConsigliaUnaCanzone";
import Social from "../pages/Social/Social";
import Calendario from "../pages/Calendario/Calendario";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./index.scss";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <AdminProvider>
            <VotingProvider>
                <BrowserRouter>
                    <ScrollToTop />
                    <Routes>
                        <Route element={<Layout />}>
                            <Route path="/" element={<Homepage />} />
                            <Route path="/karaoke" element={<ListaCanzoni />} />
                            <Route path="/djset" element={<ConsigliaUnaCanzone />} />
                            <Route path="/social" element={<Social />} />
                            <Route path="/calendario" element={<Calendario />} />
                            <Route path="/admin" element={<AdminPanel />} />
                            <Route path="/admin/karaokeList" element={<KaraokeList />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Route>
                    </Routes>
                    <NavBar />
                    <ToastContainer position="top-center" autoClose={3000} />
                </BrowserRouter>
            </VotingProvider>
        </AdminProvider>
    </StrictMode>
);
