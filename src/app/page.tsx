import Nav from '@/components/Nav';
import Footer from '@/components/Footer';
import HomeExperience from '@/components/HomeExperience';

export default function HomePage() {
  return (
    <div className="page">
      <Nav />
      <HomeExperience />
      <Footer />
    </div>
  );
}
