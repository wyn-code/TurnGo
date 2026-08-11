import type { ReactNode } from "react";
import Navbar from "@/features/landing/components/Navbar";
import Footer from "@/features/landing/components/Footer";

interface RootLayoutProps {
  children: ReactNode;
}

const RootLayout = ({ children }: RootLayoutProps) => (
  <div className="flex min-h-screen flex-col bg-background">
    <Navbar />
    <main id="main-content" className="flex-1">
      {children}
    </main>
    <Footer />
  </div>
);

export default RootLayout;
