import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import Title_Jumbotron from '../components/Title_Jumbotron';

const Contact = () => {
  return (
    <div className="contact-page-wrapper" style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh', paddingBottom: '80px' }}>
      <Title_Jumbotron
        bigHeader="CONTACT"
        bigHeaderCaps="HELPDESK"
        subtitle="BHAGALPUR COLLEGE OF ENGINEERING • OFFICIAL COMMUNICATION CHANNELS"
      />

      <Container className="py-5">
        <Row className="gy-4 mb-5">
          {/* Principal & Convenor Desk */}
          <Col md={6}>
            <Card style={{ backgroundColor: '#161519', border: '1px solid rgba(190,0,215,0.3)', borderRadius: '16px', padding: '28px', height: '100%' }}>
              <span style={{ color: '#BE00D7', fontWeight: 700, letterSpacing: '1.5px', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                INSTITUTIONAL DESK
              </span>
              <h4 className="text-white fw-bold mt-2 mb-3">Head of Institution & Convenor</h4>
              <p className="text-white-50 small mb-3">
                For formal sponsorship queries, institutional delegations, university endorsements, and administrative matters.
              </p>
              <div className="mb-2">
                <span className="text-white-50 small">Principal Desk: </span>
                <a href="mailto:principal@bcebhagalpur.ac.in" style={{ color: '#BE00D7', textDecoration: 'none', fontWeight: 600 }}>
                  principal@bcebhagalpur.ac.in
                </a>
              </div>
              <div className="mb-3">
                <span className="text-white-50 small">Technoriti Secretariat: </span>
                <a href="mailto:technoriti@bcebhagalpur.ac.in" style={{ color: '#BE00D7', textDecoration: 'none', fontWeight: 600 }}>
                  technoriti@bcebhagalpur.ac.in
                </a>
              </div>
              <p className="text-white-50 small mb-0 border-top border-secondary pt-3">
                Bhagalpur College of Engineering, BCE Campus, Post - Sabour, Bhagalpur, Bihar - 813210
              </p>
            </Card>
          </Col>

          {/* Student Steering Committee Helplines */}
          <Col md={6}>
            <Card style={{ backgroundColor: '#161519', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '16px', padding: '28px', height: '100%' }}>
              <span style={{ color: '#BE00D7', fontWeight: 700, letterSpacing: '1.5px', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                DIRECT DELEGATE HELPLINES
              </span>
              <h4 className="text-white fw-bold mt-2 mb-3">Student Coordinators Helpline</h4>

              <div className="mb-3 pb-2 border-bottom border-secondary">
                <div className="text-white fw-bold">Shubham Thakur (Lead Coordinator)</div>
                <a href="tel:9166344621" style={{ color: '#BE00D7', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
                  📞 9166344621
                </a>
              </div>

              <div className="mb-3 pb-2 border-bottom border-secondary">
                <div className="text-white fw-bold">Prof. Kumar Jyotiraditya (Boys Hostel Logistics)</div>
                <a href="tel:7004618331" style={{ color: '#BE00D7', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
                  📞 7004618331
                </a>
              </div>

              <div className="mb-2">
                <div className="text-white fw-bold">Prof. Sarika Kushwaha (Girls Hostel Logistics)</div>
                <a href="tel:7321018753" style={{ color: '#BE00D7', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem' }}>
                  📞 7321018753
                </a>
              </div>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Contact;
