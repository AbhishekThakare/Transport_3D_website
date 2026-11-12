import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import AboutExperience from '@/components/AboutExperience';

export const metadata: Metadata = { title: 'About — Krishna Roadlines' };

export default function AboutPage() {
  return (
    <div className="page">
      <Nav />
      <AboutExperience />
      <Footer />
    </div>
  );
}
