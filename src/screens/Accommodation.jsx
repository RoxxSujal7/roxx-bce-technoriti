import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import TitleJumbotron from '../components/Title_Jumbotron';
import CinematicList from '../components/CinematicList';
import Pricing from '../components/ui/pricing-02';
import './Accommodation.scss';

const ACCOMMODATION_FAQS = [
  {
    id: "01",
    title: "How do I register and reserve campus accommodation?",
    location: "BOOKING & PASSES",
    answer: (
      <p>
        You can book your stay by navigating to the <strong>Register</strong> page on this portal and
        selecting your preferred accommodation option (Lodging only ₹50, Mess only ₹125, or Combo ₹175).
        You can also pay through the integrated UPI checkout.
      </p>
    ),
  },
  {
    id: "02",
    title: "Are Boys and Girls hostel blocks separate and secure?",
    location: "CAMPUS SECURITY",
    answer: (
      <p>
        Yes, absolutely. BCE Bhagalpur operates dedicated, completely isolated hostel blocks for male and female
        delegates. Each hostel has round-the-clock campus security, biometric/register gate logs, and faculty warden
        supervision.
      </p>
    ),
  },
  {
    id: "03",
    title: "Will team members be given accommodation together?",
    location: "ROOM ALLOTMENT",
    answer: (
      <p>
        Yes, participants from the same team or institution of the same gender are allotted shared rooms together based on availability.
      </p>
    ),
  },
  {
    id: "04",
    title: "What timings are mess meals served?",
    location: "MESS DINING",
    answer: (
      <p>
        Breakfast: 7:30 AM – 9:30 AM • Lunch: 12:30 PM – 2:30 PM • Dinner: 8:00 PM – 10:30 PM.
        Special midnight snacks are available near the Hackathon arenas during overnight events.
      </p>
    ),
  },
  {
    id: "05",
    title: "Can we arrive on 5 January evening ahead of day-1?",
    location: "EARLY CHECK-IN",
    answer: (
      <p>
        Yes. If your train or bus arrives on 5 January evening, early check-in is supported by contacting
        Prof. Kumar Jyotiraditya (7004618331) or Prof. Sarika Kushwaha (7321018753) in advance.
      </p>
    ),
  },
];

const Accommodation = () => {
  return (
    <div className="accommodation-page-wrapper">
      <TitleJumbotron
        bigHeader="CAMPUS"
        bigHeaderCaps="STAY"
        subtitle="HOSTEL RESIDENCE & CAMPUS HOSPITALITY • BCE BHAGALPUR"
      />

      {/* Authoritative 21st.dev Animated Pricing-02 Component */}
      <Pricing id="tariff-breakdown" />

      <Container className="pb-5 pt-3">
        {/* Check-In Guidelines & Logistics Contacts */}
        <Row className="gy-4 mb-5">
          <Col lg={7}>
            <div className="logistics-info-card p-4 rounded-4 h-100">
              <span className="section-eyebrow text-purple">CHECK-IN PROTOCOL</span>
              <h4 className="text-white mb-3">Arrival & Document Verification</h4>
              <p className="text-white-50 mb-3">
                Check-in opens on <strong>6 January 2027 at 6:00 AM</strong> at the Main Gate Reception Desk.
                Visiting teams may request early arrival check-in with prior notification to hostel coordinators.
              </p>
              <h6 className="text-white mb-2">Mandatory Documents Checklist:</h6>
              <ul className="text-white-50 small mb-0">
                <li>1. Original College ID Card + 2 Xerox copies per member.</li>
                <li>2. Government Photo ID (Aadhar Card / Voter ID / Driving License).</li>
                <li>3. 3 Passport-size colour photographs.</li>
                <li>4. Official College NOC / Permission letter from Head of Institution.</li>
                <li>5. Printed or digital copy of Technoriti registration payment slip.</li>
              </ul>
            </div>
          </Col>
          <Col lg={5}>
            <div className="contacts-warden-card p-4 rounded-4 h-100">
              <span className="section-eyebrow text-purple">DIRECT WARDEN CONTACTS</span>
              <h4 className="text-white mb-3">Hostel Logistics Helplines</h4>

              <div className="contact-entry mb-3 pb-3 border-bottom border-secondary">
                <div className="text-white-50 small">BOYS HOSTEL COORDINATOR</div>
                <div className="fw-bold text-white fs-5">Prof. Kumar Jyotiraditya</div>
                <div className="mt-1">
                  <a href="tel:7004618331" className="phone-btn">
                    📞 7004618331 (Click to Call)
                  </a>
                </div>
              </div>

              <div className="contact-entry">
                <div className="text-white-50 small">GIRLS HOSTEL COORDINATOR</div>
                <div className="fw-bold text-white fs-5">Prof. Sarika Kushwaha</div>
                <div className="mt-1">
                  <a href="tel:7321018753" className="phone-btn">
                    📞 7321018753 (Click to Call)
                  </a>
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* Hospitality FAQs (Cinematic List Implementation) */}
        <div className="faq-section mt-5 pt-3">
          <div className="text-center mb-4">
            <span className="section-eyebrow text-purple">FREQUENTLY ASKED QUESTIONS</span>
            <h2 className="display-6 fw-bold text-white">Hospitality & Accommodation FAQs</h2>
          </div>

          <CinematicList items={ACCOMMODATION_FAQS} variant="faq" />
        </div>
      </Container>
    </div>
  );
};

export default Accommodation;
