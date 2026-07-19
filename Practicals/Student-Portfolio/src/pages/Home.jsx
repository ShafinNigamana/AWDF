import Header from '../components/Header';
import About from '../components/About';
import Skills from '../components/Skills';
import Footer from '../components/Footer';

function Home() {
  const skills = ['HTML', 'CSS', 'JavaScript', 'React', 'Node.js', 'Github', 'Git'];

  return (
    <main className="page-content container">
      <div className="hero-section card">
        <div className="avatar-placeholder">SN</div>
        <Header name="Shafin Nigamana" />
      </div>
      
      <div className="main-info-card card">
        <About />
        <Skills skillList={skills} />
      </div>
      
      <Footer />
    </main>
  );
}

export default Home;
