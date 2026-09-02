import Header from "@/components/Header";
import Hero from "@/components/Hero";
import Converter from "@/components/Converter";
import Features from "@/components/Features";
import Privacy from "@/components/Privacy";
import Roadmap from "@/components/Roadmap";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="min-h-screen">
      <Header />
      <Hero />
      <Converter />
      <Features />
      <Privacy />
      <Roadmap />
      <Footer />
    </main>
  );
}
