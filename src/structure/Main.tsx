import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";

import ScrollToTop from "./ScrollToTop";
import Layout from "./Layout/Layout";
import Homepage from "../pages/Homepage/Homepage";
import ListaCanzoni from "../pages/ListaCanzoni/ListaCanzoni";
import ConsigliaUnaCanzone from "../pages/ConsigliaUnaCanzone/ConsigliaUnaCanzone";
import Social from "../pages/Social/Social";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <BrowserRouter>
            <ScrollToTop />
            <Routes>
                <Route element={<Layout />}>
                    <Route path="/" element={<Homepage />} />
                    <Route path="/canzoni" element={<ListaCanzoni />} />
                    <Route path="/consigliaci" element={<ConsigliaUnaCanzone />} />
                    <Route path="/social" element={<Social />} />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Route>
            </Routes>
        </BrowserRouter>
    </StrictMode>
);
