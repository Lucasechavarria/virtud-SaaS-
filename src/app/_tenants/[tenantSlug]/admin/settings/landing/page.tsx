import LandingSettings from "@/features/admin/components/LandingSettings";
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Landing Page Builder | Admin",
    description: "Configura tu página de ventas pública.",
};

export default function AdminLandingPage() {
    return (
        <div className="p-4 md:p-8">
            <LandingSettings />
        </div>
    );
}
