import type { Metadata } from 'next';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import ContactExperience from '@/components/ContactExperience';

export const metadata: Metadata = { title: 'Contact — Krishna Roadlines' };

export default function ContactPage() {
  return (
    <div className="page">
      <Nav />
      <ContactExperience />
      <Footer />
    </div>
  );
}
