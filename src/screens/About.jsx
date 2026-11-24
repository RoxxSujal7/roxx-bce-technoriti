import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import Title_Jumbotron from '../components/Title_Jumbotron';
import bimleshImg from '../assets/patrons/dr_bimlesh_kumar.jpg';
import abhinavImg from '../assets/patrons/dr_abhinav_kumar.jpg';
import shashankImg from '../assets/patrons/prof_shashank_shekhar.png';
import pushpalataImg from '../assets/patrons/dr_pushpalata.png';
import './About.scss';

const About = () => {
  return (
    <div className="about-page-wrapper">
      <Title_Jumbotron
        bigHeader="ABOUT"
        bigHeaderCaps="TECHNORITI"
        subtitle="EAST INDIA'S PREMIER TECHNICAL FESTIVAL • BCE BHAGALPUR"
      />

      <Container className="py-5">
        {/* Notice 2363 Banner */}
        <div className="official-notice-banner mb-5 p-4 rounded-3">
          <div className="d-flex align-items-center gap-3 mb-2 flex-wrap">
            <span className="badge bg-purple-glow">OFFICIAL NOTICE NO. 2363</span>
            <span className="text-white-50 text-uppercase letter-spacing-1">
              Govt. of Bihar • Dept. of Science, Technology & Technical Education
            </span>
          </div>
          <h2 className="notice-title">
            Festival Leadership & Steering Committee // Technoriti '26
          </h2>
          <p className="notice-dates text-purple mb-0">
            Official Festival Dates: 6–7 January 2027 • Bhagalpur College of Engineering Campus
          </p>
        </div>

        {/* Narrative & Institutional Heritage */}
        <Row className="gy-4 mb-5 align-items-center">
          <Col lg={7}>
            <div className="about-narrative pe-lg-4">
              <span className="section-eyebrow text-purple">ESTD. 1960 • CAMPUS HERITAGE</span>
              <h2 className="display-6 fw-bold text-white mb-3">
                A Confluence of Engineering, Robotics & Pure Innovation
              </h2>
              <p className="text-white-50 lead fs-6 mb-3">
                Bhagalpur College of Engineering (BCE Bhagalpur), established in 1960, stands as one of the
                oldest and most revered technical institutions in Bihar. Operating under the Department of
                Science, Technology & Technical Education, Government of Bihar, BCE has fostered decades of
                technological leadership and research excellence.
              </p>
              <p className="text-white-50 fs-6 mb-4">
                <strong>TECHNORITI '26</strong> is East India’s premier inter-collegiate technical festival,
                bringing together over 1,500 innovators across robotics arenas, cyber forensics hackathons,
                aerospace design, coding marathons, and core structural engineering competitions.
              </p>
              <div className="d-flex gap-3 flex-wrap">
                <Link to="/events" className="btn btn-purple px-4 py-2">
                  Explore 29 Arenas ➔
                </Link>
                <Link to="/register" className="btn btn-outline-light px-4 py-2">
                  Register for Festival
                </Link>
              </div>
            </div>
          </Col>
          <Col lg={5}>
            <div className="stats-box-grid p-4 rounded-4">
              <Row className="g-3 text-center">
                <Col xs={6}>
                  <div className="stat-card p-3 rounded-3">
                    <h3 className="stat-number">1960</h3>
                    <p className="stat-label">BCE Estd. Legacy</p>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="stat-card p-3 rounded-3">
                    <h3 className="stat-number">29+</h3>
                    <p className="stat-label">Tech Competitions</p>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="stat-card p-3 rounded-3">
                    <h3 className="stat-number">₹1L+</h3>
                    <p className="stat-label">Prize Pool</p>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="stat-card p-3 rounded-3">
                    <h3 className="stat-number">1500+</h3>
                    <p className="stat-label">Innovators Expected</p>
                  </div>
                </Col>
              </Row>
            </div>
          </Col>
        </Row>

        {/* Festival Leadership / Patrons */}
        <div className="leadership-section mt-5 pt-3">
          <div className="text-center mb-5">
            <span className="section-eyebrow text-purple">GOVERNING BODY</span>
            <h2 className="display-6 fw-bold text-white">Institutional Patrons & Convenors</h2>
            <p className="text-white-50">Under whose visionary guidance Technoriti '26 is orchestrated</p>
          </div>

          <Row className="gy-4">
            {/* Dr. Bimlesh Kumar */}
            <Col lg={6}>
              <Card className="patron-feature-card h-100 p-4 rounded-4">
                <div className="d-flex gap-4 align-items-center flex-column flex-sm-row">
                  <img
                    src={bimleshImg}
                    alt="Dr. Bimlesh Kumar"
                    className="patron-avatar rounded-circle"
                  />
                  <div>
                    <span className="badge bg-purple-subtle text-purple mb-1">PATRON • HEAD OF INSTITUTION</span>
                    <h4 className="text-white mb-1">Dr. Bimlesh Kumar</h4>
                    <p className="text-white-50 mb-2">Principal, Bhagalpur College of Engineering</p>
                  </div>
                </div>
                <blockquote className="patron-quote mt-3 pt-3 border-top border-secondary text-white-50 fst-italic">
                  "Education prepares a person to meet new challenges, scale fresh heights and lead a successful
                  life. We, therefore, at BCE Bhagalpur, encourage all students to strive for the best and achieve
                  excellence through inclusiveness, integrity, innovation and creativity."
                </blockquote>
              </Card>
            </Col>

            {/* Dr. Abhinav Kumar */}
            <Col lg={6}>
              <Card className="patron-feature-card h-100 p-4 rounded-4">
                <div className="d-flex gap-4 align-items-center flex-column flex-sm-row">
                  <img
                    src={abhinavImg}
                    alt="Dr. Abhinav Kumar"
                    className="patron-avatar rounded-circle"
                  />
                  <div>
                    <span className="badge bg-purple-subtle text-purple mb-1">CONVENOR • FESTIVAL STEERING LEAD</span>
                    <h4 className="text-white mb-1">Dr. Abhinav Kumar</h4>
                    <p className="text-white-50 mb-2">Faculty Convenor • Dept. of Electronics & Communication Engg.</p>
                  </div>
                </div>
                <blockquote className="patron-quote mt-3 pt-3 border-top border-secondary text-white-50 fst-italic">
                  "Technoriti represents the relentless curiosity and technical prowess of young engineers.
                  We provide a national arena for builders, coders, and creators to push boundaries and build the
                  future."
                </blockquote>
              </Card>
            </Col>

            {/* Prof. Shashank Shekhar */}
            <Col md={6}>
              <Card className="patron-feature-card h-100 p-4 rounded-4">
                <div className="d-flex gap-3 align-items-center">
                  <img
                    src={shashankImg}
                    alt="Prof. Shashank Shekhar"
                    className="patron-avatar-sm rounded-circle"
                  />
                  <div>
                    <span className="badge bg-purple-subtle text-purple mb-1">CO-PATRON</span>
                    <h5 className="text-white mb-1">Prof. Shashank Shekhar</h5>
                    <p className="text-white-50 mb-0 small">HoD, Applied Sciences & Humanities</p>
                  </div>
                </div>
                <p className="text-white-50 small mt-3 mb-0">
                  Nurturing fundamental scientific inquiry, ethical leadership, and academic rigor to empower future engineers at TECHNORITI '26.
                </p>
              </Card>
            </Col>

            {/* Dr. Pushpalata */}
            <Col md={6}>
              <Card className="patron-feature-card h-100 p-4 rounded-4">
                <div className="d-flex gap-3 align-items-center">
                  <img
                    src={pushpalataImg}
                    alt="Dr. Pushpalata"
                    className="patron-avatar-sm rounded-circle"
                  />
                  <div>
                    <span className="badge bg-purple-subtle text-purple mb-1">CO-PATRON</span>
                    <h5 className="text-white mb-1">Dr. Pushpalata</h5>
                    <p className="text-white-50 mb-0 small">HoD, Electronics & Communication Engg.</p>
                  </div>
                </div>
                <p className="text-white-50 small mt-3 mb-0">
                  Driving technological breakthroughs, research endeavors, and student engineering innovations as Co-Patron of TECHNORITI '26.
                </p>
              </Card>
            </Col>
          </Row>
        </div>
      </Container>
    </div>
  );
};

export default About;
