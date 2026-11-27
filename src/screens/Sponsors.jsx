import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import TitleJumbotron from '../components/Title_Jumbotron';
import ButtonWithIcon from '../components/ui/ButtonWithIcon';
import './Sponsors.scss';

const sponsorsList = [
  {
    name: 'CFET New Delhi',
    abbr: 'CFET',
    role: 'Technical & Forensics Partner',
    desc: 'Centre for Forensic Excellence & Tech — Co-organizers and official evaluation partners for the Forensic Hackathon challenge.',
    tier: 'TECHNICAL PATRON'
  },
  {
    name: 'HHFC Patna',
    abbr: 'HHFC',
    role: 'Patronized Cyber Security Org',
    desc: 'Premier cyber-defense collective facilitating live threat-hunting scenarios, ethical hacking drills, and digital forensics workshops.',
    tier: 'CYBER SECURITY PATRON'
  },
  {
    name: 'DST Bihar',
    abbr: 'DST',
    role: 'Government Patron',
    desc: 'Department of Science, Technology & Technical Education, Government of Bihar — Official institutional patron under Notice No. 2363.',
    tier: 'GOVERNMENT PATRON'
  },
  {
    name: 'Debuggerzz Club',
    abbr: 'DBG',
    role: 'Coding & Cyber Community',
    desc: 'Student technical guild powering problem curation, algorithmic judging, and real-time leaderboard infrastructure for Competitive Programming.',
    tier: 'COMMUNITY PARTNER'
  },
  {
    name: 'Campus TV & Radio',
    abbr: 'TV',
    role: 'Media & Broadcasting Crew',
    desc: 'Official collegiate broadcast partner managing 4K multi-cam arena coverage, drone livestreaming, and student radio broadcasts.',
    tier: 'MEDIA PARTNER'
  },
  {
    name: 'ESROS Robotics',
    abbr: 'ESROS',
    role: 'Robotics Arena Engineers',
    desc: 'Industrial robotics automation firm providing certified combat arena cages, pit crew tools, and telemetry scoring for RoboWar & RoboSoccer.',
    tier: 'ROBOTICS ARENA PARTNER'
  }
];

const Sponsors = () => {
  return (
    <div className="sponsors-page-wrapper">
      <TitleJumbotron
        bigHeader="SPONSORS"
        bigHeaderCaps="& PARTNERS"
        subtitle="COLLABORATION NETWORK & PATRONS • TECHNORITI '26"
      />

      <Container className="py-5">
        {/* Intro Banner */}
        <div className="sponsors-intro-banner text-center mb-5 p-4 p-md-5 rounded-4">
          <span className="section-eyebrow text-purple">COLLABORATION NETWORK</span>
          <h2 className="display-6 fw-bold text-white mb-3">Empowering The Next Generation of Engineers</h2>
          <p className="text-white-50 max-w-700 mx-auto mb-4">
            Technoriti '26 is proud to partner with leading government bodies, research centers, forensics
            institutes, and developer communities to provide national exposure and career opportunities.
          </p>
          <div className="d-flex justify-content-center">
            <ButtonWithIcon
              href="mailto:principal@bcebhagalpur.ac.in?subject=Technoriti%202026%20Sponsorship%20Inquiry"
            >
              Inquire for Sponsorship
            </ButtonWithIcon>
          </div>
        </div>

        {/* Partners Grid */}
        <Row className="gy-4 mb-5">
          {sponsorsList.map((sponsor, idx) => (
            <Col lg={4} md={6} key={idx}>
              <Card className="sponsor-card h-100 p-4 rounded-4">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <div className="sponsor-logo-box rounded-3">
                    <span className="sponsor-abbr">{sponsor.abbr}</span>
                  </div>
                  <span className="badge bg-purple-subtle text-purple">{sponsor.tier}</span>
                </div>
                <h4 className="text-white mb-1">{sponsor.name}</h4>
                <div className="text-purple small fw-bold mb-3">{sponsor.role}</div>
                <p className="text-white-50 small mb-0">{sponsor.desc}</p>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Partnership Call to Action Card */}
        <div className="partner-cta-card p-4 p-md-5 rounded-4 text-center">
          <h3 className="text-white fw-bold mb-2">Become an Official Festival Partner</h3>
          <p className="text-white-50 max-w-650 mx-auto mb-4">
            Connect your brand with 1,500+ top engineering minds, innovators, and future tech leaders
            at Bihar's premier technical festival. Custom sponsorship tiers, booth spaces, and title arenas
            are available.
          </p>
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <ButtonWithIcon
              href="mailto:principal@bcebhagalpur.ac.in?subject=Technoriti%202026%20Sponsorship%20Inquiry"
            >
              Contact Principal & Convenor Desk
            </ButtonWithIcon>
            <ButtonWithIcon href="tel:9631766064">
              Call Sponsorship Lead (9631766064)
            </ButtonWithIcon>
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Sponsors;
