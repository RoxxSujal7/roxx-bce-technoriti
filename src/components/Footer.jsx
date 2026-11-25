import React from "react";
import { Link } from "react-router-dom";
import { Container, Row, Col } from "react-bootstrap";
import { AiFillInstagram, AiFillYoutube } from "react-icons/ai";
import { BsLinkedin } from "react-icons/bs";
import { FaTwitter } from "react-icons/fa";
import technoritiLogo from "../assets/technoriti-wordmark.png";
import HalftoneWordmarkFooter from "./ui/halftone-wordmark-footer";
import "./Footer.scss";

const Footer = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <footer className="technoriti-footer" id="festivalFooter">
      <Container fluid="xl" className="footer-container">
        <Row className="footer-main-row g-4">
          {/* Column 1: Static Logo Wordmark & Institutional Legacy */}
          <Col lg={4} md={6} className="footer-col footer-brand-col">
            <Link to="/" className="footer-brand-link" aria-label="Technoriti '26 Home">
              <img
                src={technoritiLogo}
                alt="TECHNORITI '26"
                className="footer-technoriti-logo"
              />
            </Link>

            <div className="footer-inst-info">
              <h3 className="inst-college-title">Bhagalpur College of Engineering</h3>
              <p className="inst-college-meta">
                Estd. 1960 • BCE Campus Sabour, Bhagalpur, Bihar – 813210
              </p>
              <div className="inst-contact-desk">
                <span className="desk-prefix">Official Desk: </span>
                <a href="mailto:technoriti@bcebhagalpur.ac.in" className="desk-mail-link">
                  technoriti@bcebhagalpur.ac.in
                </a>
              </div>
            </div>
          </Col>

          {/* Column 2: Festival Portal */}
          <Col lg={3} sm={6} className="footer-col footer-nav-col">
            <h4 className="footer-col-heading">Festival Portal</h4>
            <ul className="footer-links-list">
              <li><Link to="/">Home</Link></li>
              <li><Link to="/about">About Technoriti</Link></li>
              <li><Link to="/events">29 Competition Arenas</Link></li>
              <li><Link to="/accommodation">Campus Accommodation</Link></li>
              <li><Link to="/sponsors">Sponsors & Partners</Link></li>
              <li><Link to="/team">Steering Committee</Link></li>
            </ul>
          </Col>

          {/* Column 3: Participant Desk */}
          <Col lg={2} sm={6} className="footer-col footer-nav-col">
            <h4 className="footer-col-heading">Participant Desk</h4>
            <ul className="footer-links-list">
              <li><Link to="/register">Event Registration</Link></li>
              <li><Link to="/dashboard">Delegate Dashboard</Link></li>
              <li><Link to="/signin">Participant Sign In</Link></li>
              <li><Link to="/signup">Create Account</Link></li>
              <li><Link to="/faq">Hospitality FAQs</Link></li>
              <li><Link to="/contact">Helpline & Contacts</Link></li>
            </ul>
          </Col>

          {/* Column 4: Connect & Helpline */}
          <Col lg={3} md={6} className="footer-col footer-connect-col">
            <h4 className="footer-col-heading">Connect & Helpline</h4>
            <div className="footer-social-icons">
              <a
                href="https://linkedin.com/in/bhagalpur-college-of-engineering-897354228"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn"
                aria-label="LinkedIn"
              >
                <BsLinkedin aria-hidden="true" />
              </a>
              <a
                href="https://instagram.com/bcebhagalpur_official"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn"
                aria-label="Instagram"
              >
                <AiFillInstagram aria-hidden="true" />
              </a>
              <a
                href="https://twitter.com/bce_bhagalpur"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn"
                aria-label="Twitter / X"
              >
                <FaTwitter aria-hidden="true" />
              </a>
              <a
                href="https://www.youtube.com/@bcebhagalpurofficial"
                target="_blank"
                rel="noopener noreferrer"
                className="social-btn"
                aria-label="YouTube"
              >
                <AiFillYoutube aria-hidden="true" />
              </a>
            </div>

            <div className="footer-warden-box">
              <div className="warden-item">
                <span className="warden-label">Boys Hostel Helpline:</span>
                <a href="tel:7004618331" className="warden-tel">+91 70046 18331</a>
              </div>
              <div className="warden-item">
                <span className="warden-label">Girls Hostel Helpline:</span>
                <a href="tel:7321018753" className="warden-tel">+91 73210 18753</a>
              </div>
            </div>
          </Col>
        </Row>

        {/* Bottom Horizontal Bar: Separator & Legal Notice */}
        <div className="footer-bottom-divider">
          <p className="footer-copyright-text">
            © 2026 TECHNORITI, BCE Bhagalpur. All Rights Reserved. • East India's Premier Technical Festival
          </p>
          <button type="button" className="footer-top-btn" onClick={scrollToTop}>
            Back to top ↑
          </button>
        </div>
      </Container>

      {/* Very Bottom: Decorative Interactive Halftone Wordmark */}
      <div className="footer-halftone-bottom-wrap">
        <HalftoneWordmarkFooter
          as="div"
          wordmark="Technoriti '26"
          label=""
          meta=""
          columns={[]}
          backToTop={false}
          palette={{ background: "#000000", ink: "#F0EBF3", warm: "#BE00D7" }}
          dotGap={6}
          radius={85}
          crop={0}
          grain={0.35}
          interactive={true}
          fontWeight={800}
          height="180px"
          className="footer-bottom-halftone-canvas"
        />
      </div>
    </footer>
  );
};

export default Footer;
