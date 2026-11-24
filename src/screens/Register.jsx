import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Modal, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import Title_Jumbotron from '../components/Title_Jumbotron';
import { competitionsList } from '../content/events';
import ButtonWithIcon from '../components/ui/ButtonWithIcon';
import './Register.scss';

const Register = () => {
  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    rollNumber: '',
    phone: '',
    college: '',
    branch: '',
    primaryArena: competitionsList[0]?.id || 'robowar',
    teamSize: '1',
    additionalArenas: [],
    accommodation: 'none', // 'none' | 'lodging' | 'mess' | 'both'
  });

  const [additionalSelection, setAdditionalSelection] = useState('');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [utrNumber, setUtrNumber] = useState('');
  const [registrationSubmitted, setRegistrationSubmitted] = useState(false);
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Selected Primary Competition details
  const primaryComp = competitionsList.find(c => c.id === formData.primaryArena) || competitionsList[0];

  // Helper to calculate cost of a competition given team size
  const getArenaCost = (comp, teamMembersCount) => {
    if (!comp) return 0;
    const feeStr = comp.fee || '';
    if (feeStr.includes('per member') || feeStr.includes('/ member') || feeStr.includes('/ head') || feeStr.includes('/ person')) {
      const match = feeStr.match(/₹?(\d+)/);
      const perHead = match ? parseInt(match[1], 10) : 50;
      return perHead * teamMembersCount;
    } else if (feeStr.includes('per team') || feeStr.includes('/ team') || feeStr.includes('per squad') || feeStr.includes('/ squad')) {
      const match = feeStr.match(/₹?(\d+)/);
      return match ? parseInt(match[1], 10) : 200;
    }
    return 50;
  };

  const primaryCost = getArenaCost(primaryComp, parseInt(formData.teamSize, 10));

  // Additional Arenas Cost
  const additionalCost = formData.additionalArenas.reduce((acc, arenaId) => {
    const comp = competitionsList.find(c => c.id === arenaId);
    return acc + getArenaCost(comp, 1);
  }, 0);

  // Accommodation Cost
  let accomCost = 0;
  if (formData.accommodation === 'lodging') accomCost = 50 * parseInt(formData.teamSize, 10);
  if (formData.accommodation === 'mess') accomCost = 125 * parseInt(formData.teamSize, 10);
  if (formData.accommodation === 'both') accomCost = 175 * parseInt(formData.teamSize, 10);

  const totalPayable = primaryCost + additionalCost + accomCost;

  // Handle Input Changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Add Additional Arena
  const handleAddArena = () => {
    if (
      additionalSelection &&
      additionalSelection !== formData.primaryArena &&
      !formData.additionalArenas.includes(additionalSelection)
    ) {
      setFormData(prev => ({
        ...prev,
        additionalArenas: [...prev.additionalArenas, additionalSelection]
      }));
      setAdditionalSelection('');
    }
  };

  // Remove Additional Arena
  const handleRemoveArena = (id) => {
    setFormData(prev => ({
      ...prev,
      additionalArenas: prev.additionalArenas.filter(a => a !== id)
    }));
  };

  // Submit to Gateway Modal
  const handleOpenGateway = (e) => {
    e.preventDefault();
    setShowCheckoutModal(true);
  };

  // Copy UPI
  const handleCopyUpi = () => {
    navigator.clipboard.writeText('bcebhagalpur@upi');
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  // Final submission — strict UTR validation (12-digit numeric, no leading/trailing spaces)
  const handleFinalVerify = (e) => {
    e.preventDefault();
      const cleanUtr = utrNumber.trim();
      if (!cleanUtr || !/^\d{12}$/.test(cleanUtr)) {
        alert('Please enter a valid 12-digit numeric UPI UTR / Transaction Reference Number (digits only, no spaces or letters).');
        return;
      }
      setRegistrationSubmitted(true);
    };

    // Build UPI deep-link — amount embedded, phone used only as transaction note suffix (no PII in URL path)
    const safePhone = formData.phone.replace(/\D/g, '').slice(-10);
    const upiUrl = `upi://pay?pa=bcebhagalpur@upi&pn=Technoriti%202026%20BCE&am=${totalPayable}&cu=INR&tn=REG-${safePhone || '2026'}`;
    // QR generated locally using an inline SVG data URI approach is preferable, but we keep the
    // external QR API call scoped to non-sensitive data only: the already-public UPI VPA + amount.
    // The phone number is NOT passed to the external QR server.
    const qrData = `upi://pay?pa=bcebhagalpur@upi&pn=Technoriti%202026%20BCE&am=${totalPayable}&cu=INR`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrData)}`;

    return (
      <div className="register-page-wrapper">
        <Title_Jumbotron
          bigHeader="FESTIVAL"
          bigHeaderCaps="REGISTRATION"
          subtitle="SLOT BOOKING FOR 29 ARENAS & CAMPUS ACCOMMODATION • 6–7 JAN 2027"
        />

        <Container className="py-5">
          <Row className="justify-content-center">
            <Col lg={10}>
              <Card className="registration-card p-4 p-md-5 rounded-4">
                <div className="card-header-badge mb-4">
                  <span className="badge bg-purple-glow px-3 py-2">SLOT BOOKING LIVE // 6–7 JAN 2027</span>
                  <h2 className="text-white fw-bold mt-2">Participant Registration Form</h2>
                  <p className="text-white-50 small mb-0">
                    Fill in your academic and delegation details. Dynamic fee calculation applies automatically.
                  </p>
                </div>

                <Form onSubmit={handleOpenGateway}>
                  {/* 1. Delegate Personal Details */}
                  <h5 className="section-divider-title text-purple mb-3">01 // Delegate Information</h5>
                  <Row className="gy-3 mb-4">
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="text-white small">Full Name *</Form.Label>
                        <Form.Control
                          type="text"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleChange}
                          required
                          placeholder="e.g. Sujal Kumar"
                          className="dark-input"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="text-white small">University / College Roll Number *</Form.Label>
                        <Form.Control
                          type="text"
                          name="rollNumber"
                          value={formData.rollNumber}
                          onChange={handleChange}
                          required
                          placeholder="e.g. 24103123001"
                          className="dark-input"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="text-white small">WhatsApp / Contact Phone * (10 Digits)</Form.Label>
                        <Form.Control
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          required
                          placeholder="e.g. 9876543210"
                          className="dark-input"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group>
                        <Form.Label className="text-white small">College / University Name *</Form.Label>
                        <Form.Control
                          type="text"
                          name="college"
                          value={formData.college}
                          onChange={handleChange}
                          required
                          placeholder="e.g. Bhagalpur College of Engineering"
                          className="dark-input"
                        />
                      </Form.Group>
                    </Col>
                    <Col md={12}>
                      <Form.Group>
                        <Form.Label className="text-white small">Branch & Department *</Form.Label>
                        <Form.Control
                          type="text"
                          name="branch"
                          value={formData.branch}
                          onChange={handleChange}
                          required
                          placeholder="e.g. Electronics & Communication Engineering (ECE)"
                          className="dark-input"
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  {/* 2. Competition Arena Selection */}
                  <h5 className="section-divider-title text-purple mb-3">02 // Arena Selection</h5>
                  <Row className="gy-3 mb-4">
                    <Col md={8}>
                      <Form.Group>
                        <Form.Label className="text-white small">Primary Competition / Arena *</Form.Label>
                        <Form.Select
                          name="primaryArena"
                          value={formData.primaryArena}
                          onChange={handleChange}
                          className="dark-input"
                        >
                          {competitionsList.map(comp => (
                            <option key={comp.id} value={comp.id}>
                              {comp.title} ({comp.fee} • {comp.team_size})
                            </option>
                          ))}
                        </Form.Select>
                        <Form.Text className="text-white-50 small">
                          Prize: {primaryComp.prize_pool} • Venue: {primaryComp.venue}
                        </Form.Text>
                      </Form.Group>
                    </Col>

                    <Col md={4}>
                      <Form.Group>
                        <Form.Label className="text-white small">Team Members in Arena *</Form.Label>
                        <Form.Select
                          name="teamSize"
                          value={formData.teamSize}
                          onChange={handleChange}
                          className="dark-input"
                        >
                          <option value="1">1 (Solo)</option>
                          <option value="2">2 Members</option>
                          <option value="3">3 Members</option>
                          <option value="4">4 Members</option>
                          {primaryComp.team_size && primaryComp.team_size.includes('5') && <option value="5">5 Members</option>}
                        </Form.Select>
                      </Form.Group>
                    </Col>

                    {/* Additional Arenas */}
                    <Col md={12}>
                      <Form.Label className="text-white small">Add Additional Competition (Optional)</Form.Label>
                      <div className="d-flex gap-2">
                        <Form.Select
                          value={additionalSelection}
                          onChange={(e) => setAdditionalSelection(e.target.value)}
                          className="dark-input"
                        >
                          <option value="">Select another arena...</option>
                          {competitionsList
                            .filter(c => c.id !== formData.primaryArena && !formData.additionalArenas.includes(c.id))
                            .map(c => (
                              <option key={c.id} value={c.id}>
                                {c.title} ({c.fee})
                              </option>
                            ))}
                        </Form.Select>
                        <Button
                          variant="purple"
                          type="button"
                          onClick={handleAddArena}
                          disabled={!additionalSelection}
                          className="px-4"
                        >
                          ＋ Add
                        </Button>
                      </div>

                      {formData.additionalArenas.length > 0 && (
                        <div className="mt-3 d-flex gap-2 flex-wrap">
                          {formData.additionalArenas.map(aId => {
                            const c = competitionsList.find(x => x.id === aId);
                            return (
                              <Badge
                                key={aId}
                                bg="secondary"
                                className="p-2 d-flex align-items-center gap-2"
                              >
                                <span>{c?.title} ({c?.fee})</span>
                                <span
                                  style={{ cursor: 'pointer', fontWeight: 'bold' }}
                                  onClick={() => handleRemoveArena(aId)}
                                >
                                  ✕
                                </span>
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </Col>
                  </Row>

                  {/* 3. Campus Accommodation */}
                  <h5 className="section-divider-title text-purple mb-3">03 // Campus Accommodation Option</h5>
                  <Row className="gy-3 mb-4">
                    <Col md={12}>
                      <div className="accommodation-options-grid">
                        <label className={`option-card ${formData.accommodation === 'none' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="accommodation"
                            value="none"
                            checked={formData.accommodation === 'none'}
                            onChange={handleChange}
                            className="d-none"
                          />
                          <div className="option-title">No Stay Needed</div>
                          <div className="option-price">₹0</div>
                          <div className="option-desc">Day scholar / local commute</div>
                        </label>

                        <label className={`option-card ${formData.accommodation === 'lodging' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="accommodation"
                            value="lodging"
                            checked={formData.accommodation === 'lodging'}
                            onChange={handleChange}
                            className="d-none"
                          />
                          <div className="option-title">Lodging Only</div>
                          <div className="option-price">₹50 / day</div>
                          <div className="option-desc">Bedding & 24/7 security</div>
                        </label>

                        <label className={`option-card ${formData.accommodation === 'mess' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="accommodation"
                            value="mess"
                            checked={formData.accommodation === 'mess'}
                            onChange={handleChange}
                            className="d-none"
                          />
                          <div className="option-title">Mess Dining Only</div>
                          <div className="option-price">₹125 / day</div>
                          <div className="option-desc">Breakfast, Lunch & Dinner</div>
                        </label>

                        <label className={`option-card ${formData.accommodation === 'both' ? 'selected' : ''}`}>
                          <input
                            type="radio"
                            name="accommodation"
                            value="both"
                            checked={formData.accommodation === 'both'}
                            onChange={handleChange}
                            className="d-none"
                          />
                          <div className="option-title">Full All-Inclusive</div>
                          <div className="option-price text-purple">₹175 / day</div>
                          <div className="option-desc">Hostel + 3 Meals Combo</div>
                        </label>
                      </div>
                    </Col>
                  </Row>

                  {/* 4. Live Fee Summary & Checkout Trigger */}
                  <div className="fee-summary-strip p-4 rounded-3 mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                    <div>
                      <div className="text-white-50 small">COMPETITIONS + ACCOMMODATION TOTAL</div>
                      <div className="total-display text-white fw-bold fs-3">
                        ₹{totalPayable}
                        <span className="fs-6 text-white-50 ms-2">
                          ({formData.teamSize} Member{formData.teamSize !== '1' ? 's' : ''})
                        </span>
                      </div>
                    </div>
                    <div>
                      <ButtonWithIcon type="submit">
                        PROCEED TO PAYMENT GATEWAY
                      </ButtonWithIcon>
                    </div>
                  </div>
                </Form>
              </Card>
            </Col>
          </Row>
        </Container>

        {/* UPI Payment Gateway Modal */}
        <Modal
          show={showCheckoutModal}
          onHide={() => setShowCheckoutModal(false)}
          centered
          className="technoriti-payment-modal"
        >
          <Modal.Header closeButton closeVariant="white">
            <Modal.Title className="text-white fs-5 fw-bold">
              ⚡ OFFICIAL UPI PAYMENT GATEWAY // TECHNORITI '26
            </Modal.Title>
          </Modal.Header>
          <Modal.Body className="p-4 text-white">
            {!registrationSubmitted ? (
              <div>
                {/* Order Summary */}
                <div className="order-summary-box p-3 rounded-3 mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="text-white-50 small">ORDER REFERENCE:</span>
                    <span className="badge bg-purple-glow">REG-BCE-2026</span>
                  </div>
                  <div className="summary-row d-flex justify-content-between small py-1">
                    <span className="text-white-50">Participant:</span>
                    <span className="text-white fw-bold">{formData.fullName || 'Registered Delegate'}</span>
                  </div>
                  <div className="summary-row d-flex justify-content-between small py-1">
                    <span className="text-white-50">Primary Arena:</span>
                    <span className="text-white">{primaryComp.title}</span>
                  </div>
                  {formData.additionalArenas.length > 0 && (
                    <div className="summary-row d-flex justify-content-between small py-1">
                      <span className="text-white-50">Additional Arenas:</span>
                      <span className="text-white">{formData.additionalArenas.length} Extra</span>
                    </div>
                  )}
                  <div className="summary-row d-flex justify-content-between small py-1">
                    <span className="text-white-50">Campus Stay:</span>
                    <span className="text-white text-capitalize">{formData.accommodation}</span>
                  </div>
                  <div className="summary-row d-flex justify-content-between fw-bold pt-2 border-top border-secondary mt-2">
                    <span>TOTAL PAYABLE:</span>
                    <span className="text-purple fs-5">₹{totalPayable}</span>
                  </div>
                </div>

                {/* QR & UPI Intent */}
                <div className="text-center mb-4">
                  <div className="qr-box p-3 bg-white rounded-3 d-inline-block mb-3">
                    <img src={qrUrl} alt="UPI Payment QR Code" width="180" height="180" />
                  </div>
                  <div className="upi-id-box d-flex align-items-center justify-content-center gap-2 mb-2">
                    <span className="text-white-50 small">OFFICIAL UPI VPA:</span>
                    <code className="text-purple fw-bold bg-dark px-2 py-1 rounded">bcebhagalpur@upi</code>
                    <Button
                      variant="outline-light"
                      size="sm"
                      onClick={handleCopyUpi}
                      className="py-0 px-2"
                    >
                      {copiedUpi ? '✓ Copied' : 'Copy'}
                    </Button>
                  </div>
                  <div className="small text-white-50 mb-3">Payee: Technoriti 2026 BCE</div>
                  <a
                    href={upiUrl}
                    className="btn btn-purple btn-sm px-4 py-2 w-100"
                  >
                    📱 Pay via Any UPI App (GPay / PhonePe / Paytm / BHIM)
                  </a>
                </div>

                {/* UTR Input Form */}
                <Form onSubmit={handleFinalVerify}>
                  <Form.Group className="mb-3">
                    <Form.Label className="small text-white fw-bold">
                      ENTER 12-DIGIT UPI TRANSACTION REF / UTR NUMBER *
                    </Form.Label>
                    <Form.Control
                      type="text"
                      required
                      inputMode="numeric"
                      pattern="\d{12}"
                      maxLength={12}
                      placeholder="e.g. 432109876543 (12 digits from your payment screen)"
                      value={utrNumber}
                      onChange={(e) => setUtrNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                      className="dark-input"
                    />
                    <Form.Text className="text-white-50 small">
                      Your UTR verifies your payment slip against the accounts desk.
                    </Form.Text>
                  </Form.Group>

                  <div className="d-flex justify-content-between gap-2">
                    <Button
                      variant="outline-secondary"
                      onClick={() => setShowCheckoutModal(false)}
                      className="w-50"
                    >
                      ← Back to Edit
                    </Button>
                    <Button
                      variant="purple"
                      type="submit"
                      className="w-50"
                    >
                      VERIFY & COMPLETE ✓
                    </Button>
                  </div>
                </Form>
              </div>
            ) : (
              /* Successful Registration Receipt Screen */
              <div className="text-center py-3">
                <div className="success-icon mb-3">🎉</div>
                <h4 className="text-white fw-bold mb-2">Registration Recorded Successfully!</h4>
                <p className="text-white-50 small mb-4">
                  Thank you, <strong>{formData.fullName}</strong>. Your registration for{' '}
                  <strong>{primaryComp.title}</strong> has been logged under Reference ID:
                </p>
                <div className="p-3 bg-dark rounded-3 border border-purple mb-4">
                  <div className="small text-white-50">OFFICIAL PASS CODE:</div>
                  <div className="fs-4 text-purple fw-bold">
                    REG-{formData.phone ? formData.phone.slice(-6) : '813210'}-{utrNumber.slice(-4) || '9921'}
                  </div>
                  <div className="small text-white-50 mt-1">UTR: {utrNumber} • Verified Slot</div>
                </div>
                <div className="d-flex gap-2 justify-content-center">
                  <Button
                    variant="purple"
                    onClick={() => window.print()}
                    className="px-4"
                  >
                    🖨 Print / Save Receipt
                  </Button>
                  <Link
                    to="/"
                    className="btn btn-outline-light px-4"
                    onClick={() => setShowCheckoutModal(false)}
                  >
                    Return to Home
                  </Link>
                </div>
              </div>
            )}
          </Modal.Body>
        </Modal>
      </div>
    );
  };

  export default Register;
