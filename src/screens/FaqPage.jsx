import React from 'react';
import { Container } from 'react-bootstrap';
import TitleJumbotron from '../components/Title_Jumbotron';
import CinematicList from '../components/CinematicList';

const FAQ_DIRECTORY = [
  {
    id: "01",
    title: "What are the official dates and venue for Technoriti '26?",
    location: "DATES & VENUE",
    answer: (
      <p>
        Technoriti '26 will be hosted on <strong>6–7 January 2027</strong> at the historic campus of{" "}
        <strong>Bhagalpur College of Engineering (BCE Bhagalpur)</strong>, Sabour, Bihar - 813210.
      </p>
    ),
  },
  {
    id: "02",
    title: "Who is eligible to participate?",
    location: "ELIGIBILITY",
    answer: (
      <p>
        Undergraduate and postgraduate students from any recognized university, technical institute, or college
        across India are eligible. Inter-college teams are permitted in specific open arenas like Hackathons and RoboWar.
      </p>
    ),
  },
  {
    id: "03",
    title: "Can I participate in multiple competitions?",
    location: "REGISTRATION",
    answer: (
      <p>
        Yes! You can select a primary arena and add additional competitions on the Registration page, provided
        their event schedules do not clash.
      </p>
    ),
  },
  {
    id: "04",
    title: "How are cash prizes distributed?",
    location: "AWARDS & PRIZES",
    answer: (
      <p>
        Cash prizes totaling over ₹1,00,000 are awarded during the Grand Valedictory Ceremony on 7 January 2027.
        Prize amounts are transferred directly to winning team bank accounts via NEFT/UPI along with official merit certificates.
      </p>
    ),
  },
  {
    id: "05",
    title: "What are the campus accommodation charges?",
    location: "HOSPITALITY",
    answer: (
      <p>
        Campus hostel lodging is ₹50 per person per day. Mess dining (all 3 meals) is ₹125 per day. The complete
        all-inclusive combo package is ₹175 per head per day, with special flat discounts for groups over 4 and 12 members.
      </p>
    ),
  },
];

const FaqPage = () => {
  return (
    <div className="faq-page-wrapper" style={{ backgroundColor: '#000000', color: '#ffffff', minHeight: '100vh', paddingBottom: '80px' }}>
      <TitleJumbotron
        bigHeader="FREQUENTLY"
        bigHeaderCaps="ASKED QUESTIONS"
        subtitle="ESSENTIAL FESTIVAL DIRECTORY • TECHNORITI '26 • BCE BHAGALPUR"
      />

      <Container className="py-5" style={{ maxWidth: '1000px' }}>
        <div className="mb-4 text-center">
          <span style={{ color: '#BE00D7', fontWeight: 700, letterSpacing: '2px', fontSize: '0.8rem', textTransform: 'uppercase' }}>
            KNOWLEDGE BASE
          </span>
          <h2 className="display-6 fw-bold text-white mt-1">Festival Guide & Participant Policies</h2>
        </div>

        <CinematicList items={FAQ_DIRECTORY} variant="faq" />
      </Container>
    </div>
  );
};

export default FaqPage;
