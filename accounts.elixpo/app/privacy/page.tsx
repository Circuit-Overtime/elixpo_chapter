import type { Metadata } from "next";
import Navbar from "../components/navbar";
import Footer from "../components/footer";
import PrivacyContent from "./content";

export const metadata: Metadata = {
    title: "Privacy Policy — Elixpo Accounts",
    description:
        "How Elixpo Accounts collects, uses, and protects your personal information.",
};

export default function PrivacyPage() {
    return (
        <div className="relative w-full min-h-screen font-body text-[#192837] bg-[#F2F2EE] selection:bg-[#7342E2] selection:text-white flex flex-col justify-between overflow-x-hidden">
            <style>{`
                .font-heading { font-family: var(--font-heading), sans-serif; }
                .font-body { font-family: var(--font-body), sans-serif; }
            `}</style>

            <Navbar />
            <PrivacyContent />
            <Footer />
        </div>
    );
}
