import React from 'react';
import { Link } from 'react-router-dom';
import Container from 'react-bootstrap/Container';
import Card from 'react-bootstrap/Card';
import TitleJumbotron from '../components/Title_Jumbotron';

const Legal = () => {
  return (
    <div className="register-page-wrapper">
      <TitleJumbotron
        bigHeader="INSTITUTIONAL"
        bigHeaderCaps="POLICIES"
        subtitle="PRIVACY, VERIFICATION &amp; CONDUCT NOTICE • TECHNORITI '26"
      />

      <Container className="py-5">
        <div className="d-flex flex-column gap-4" style={{ maxWidth: '860px', margin: '0 auto' }}>
          <Card className="registration-card p-4 p-md-5 rounded-4">
            <h2 className="h5 text-purple fw-bold mb-3">01 // Participant Data &amp; Privacy Notice</h2>
            <p className="text-white-75 small mb-2">
              TECHNORITI &apos;26 (Bhagalpur College of Engineering, Sabour, Bhagalpur, Bihar 813210) collects delegate account
              credentials, college/roll details, contact phone numbers, competition selections, and 12-digit UPI UTR references
              solely for event registration, pass issuance, on-campus verification, and competition coordination.
            </p>
            <p className="text-white-75 small mb-0">
              Authentication and role-based access are enforced via Supabase Auth and PostgreSQL Row-Level Security. Assigned competition
              coordinators can view non-financial participant rosters only for their assigned arenas.
            </p>
          </Card>

          <Card className="registration-card p-4 p-md-5 rounded-4">
            <h2 className="h5 text-purple fw-bold mb-3">02 // Payment Verification &amp; Institutional Settlement</h2>
            <p className="text-white-75 small mb-2">
              All registration totals are computed authoritatively on the server from live PostgreSQL fee and accommodation catalogs.
              UPI payments are settled directly to the official BCE Bhagalpur VPA and require manual UTR reconciliation by the
              authorized Accounts Desk before an official pass moves to VERIFIED status.
            </p>
            <p className="text-white-75 small mb-0">
              Duplicate or previously submitted UTR numbers are rejected automatically. Retain your UPI transaction receipt until your
              pass shows VERIFIED in your <Link to="/dashboard" className="text-purple">Delegate Dashboard</Link>.
            </p>
          </Card>

          <Card className="registration-card p-4 p-md-5 rounded-4">
            <h2 className="h5 text-purple fw-bold mb-3">03 // Grievances, Corrections &amp; Policy Inquiries</h2>
            <p className="text-white-75 small mb-3">
              For registration corrections, UTR reconciliation discrepancies, refund/cancellation inquiries subject to institutional
              approval, or data-removal requests, contact the official BCE Bhagalpur Organizing Desk before event check-in.
            </p>
            <ul className="list-unstyled small text-white-75 mb-0 d-flex flex-column gap-1">
              <li>Email: <a href="mailto:technoritibce@gmail.com" className="text-purple">technoritibce@gmail.com</a></li>
              <li>Phone: <a href="tel:+918102330916" className="text-purple">+91 81023 30916</a></li>
              <li>Campus: Bhagalpur College of Engineering (BCE), Sabour, Bhagalpur, Bihar 813210</li>
            </ul>
          </Card>
        </div>
      </Container>
    </div>
  );
};

export default Legal;
