import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Modal, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import QRCode from 'qrcode';
import Title_Jumbotron from '../components/Title_Jumbotron';
import { competitionsList } from '../content/events';
import ButtonWithIcon from '../components/ui/ButtonWithIcon';
import { useAuth } from '../context/AuthContext';
import { callEdgeFunction, isSupabaseConfigured, supabase, UPI_CONFIG } from '../lib/supabaseClient';
import './Register.scss';

function parseTeamRange(comp) {
  if (!comp) return { min: 1, max: 4 };
  if (typeof comp.min_team_size === 'number' && typeof comp.max_team_size === 'number') {
    return { min: comp.min_team_size, max: comp.max_team_size };
  }
  const nums = String(comp.team_size || '1-4').match(/\d+/g)?.map(Number) || [1, 4];
  return { min: nums[0], max: nums.length > 1 ? nums[1] : nums[0] };
}

function formatFeeLabel(comp, fallbackFee) {
  if (typeof comp?.fee_inr === 'number' && comp?.fee_type) {
    return `₹${comp.fee_inr} / ${comp.fee_type === 'per_team' ? 'team' : 'member'}`;
  }
  return fallbackFee || '';
}

function formatTeamSizeLabel(comp, fallbackLabel) {
  if (typeof comp?.min_team_size === 'number' && typeof comp?.max_team_size === 'number') {
    if (comp.min_team_size === 1 && comp.max_team_size === 1) return 'Solo';
    if (comp.min_team_size === comp.max_team_size) return `${comp.min_team_size} Members`;
    return `${comp.min_team_size}-${comp.max_team_size} Members`;
  }
  return fallbackLabel || '';
}

function getArenaCost(comp, teamMembersCount) {
  if (!comp) return 0;
  if (typeof comp.fee_inr === 'number') {
    return comp.fee_type === 'per_team' ? comp.fee_inr : comp.fee_inr * teamMembersCount;
  }
  const feeStr = comp.fee || '';
  if (feeStr.includes('per member') || feeStr.includes('/ member') || feeStr.includes('/ head') || feeStr.includes('/ person')) {
    const match = feeStr.match(/₹?(\d+)/);
    const perHead = match ? parseInt(match[1], 10) : 50;
    return perHead * teamMembersCount;
  }
  if (feeStr.includes('per team') || feeStr.includes('/ team') || feeStr.includes('per squad') || feeStr.includes('/ squad')) {
    const match = feeStr.match(/₹?(\d+)/);
    return match ? parseInt(match[1], 10) : 200;
  }
  return 50;
}

const Register = () => {
  const navigate = useNavigate();
  const { configured, session, profile, refreshProfile } = useAuth();

  const [catalog, setCatalog] = useState(competitionsList);
  const [accomRates, setAccomRates] = useState({ none: 0, lodging: 50, mess: 125, both: 175 });

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
  const [copiedUpi, setCopiedUpi] = useState(false);

  // Server integration state
  const [creatingReg, setCreatingReg] = useState(false);
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [formError, setFormError] = useState('');
  const [modalError, setModalError] = useState('');
  const [serverRegistration, setServerRegistration] = useState(null);
  const [upiPaymentInfo, setUpiPaymentInfo] = useState(null);
  const [submittedPayment, setSubmittedPayment] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const copyTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    };
  }, []);

  // Pre-fill profile fields if authenticated
  useEffect(() => {
    if (!profile) return;
    setFormData((prev) => ({
      ...prev,
      fullName: prev.fullName || profile.full_name || '',
      rollNumber: prev.rollNumber || profile.roll_number || '',
      phone: prev.phone || profile.phone || '',
      college: prev.college || profile.college || '',
      branch: prev.branch || profile.branch || '',
    }));
  }, [profile]);

  // Sync authoritative active tariffs & limits from Supabase if configured
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return;
    let mounted = true;
    Promise.all([
      supabase.from('competitions').select('id, title, fee_type, fee_inr, min_team_size, max_team_size, prize_pool, venue, is_active').eq('is_active', true).order('num_id', { ascending: true }),
      supabase.from('accommodation_plans').select('id, price_per_person_inr, is_active').eq('is_active', true),
    ]).then(([cRes, aRes]) => {
      if (!mounted) return;
      if (Array.isArray(cRes.data) && cRes.data.length > 0) {
        const dbById = new Map(cRes.data.map((r) => [r.id, r]));
        const nextCatalog = competitionsList
          .filter((c) => dbById.has(c.id))
          .map((c) => {
            const db = dbById.get(c.id);
            return {
              ...c,
              title: db.title || c.title,
              fee: formatFeeLabel(db, c.fee),
              team_size: formatTeamSizeLabel(db, c.team_size),
              fee_type: db.fee_type,
              fee_inr: db.fee_inr,
              min_team_size: db.min_team_size,
              max_team_size: db.max_team_size,
              prize_pool: db.prize_pool || c.prize_pool,
              venue: db.venue || c.venue,
            };
          });
        setCatalog(nextCatalog);
        const activeIds = new Set(nextCatalog.map((c) => c.id));
        setFormData((prev) => {
          const nextPrimary = activeIds.has(prev.primaryArena) ? prev.primaryArena : (nextCatalog[0]?.id || prev.primaryArena);
          return {
            ...prev,
            primaryArena: nextPrimary,
            additionalArenas: prev.additionalArenas.filter((id) => id !== nextPrimary && activeIds.has(id)),
          };
        });
        setAdditionalSelection((prev) => (prev && activeIds.has(prev) ? prev : ''));
      }
      if (Array.isArray(aRes.data) && aRes.data.length > 0) {
        const nextRates = { none: 0, lodging: 50, mess: 125, both: 175 };
        for (const row of aRes.data) {
          nextRates[row.id] = Number(row.price_per_person_inr);
        }
        setAccomRates(nextRates);
      }
    }).catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const primaryComp = useMemo(
    () => catalog.find((c) => c.id === formData.primaryArena) || catalog[0] || competitionsList[0],
    [catalog, formData.primaryArena],
  );

  const teamRange = useMemo(() => parseTeamRange(primaryComp), [primaryComp]);

  // Keep teamSize inside allowed bounds when switching competitions
  useEffect(() => {
    const numeric = parseInt(formData.teamSize, 10) || teamRange.min;
    if (numeric < teamRange.min || numeric > teamRange.max) {
      setFormData((prev) => ({ ...prev, teamSize: String(teamRange.min) }));
    }
  }, [teamRange.min, teamRange.max, formData.teamSize]);

  const parsedTeamSize = Math.min(teamRange.max, Math.max(teamRange.min, parseInt(formData.teamSize, 10) || teamRange.min));
  const primaryCost = getArenaCost(primaryComp, parsedTeamSize);
  const additionalCost = formData.additionalArenas.reduce((acc, arenaId) => {
    const comp = catalog.find((c) => c.id === arenaId);
    return acc + getArenaCost(comp, 1);
  }, 0);
  const accomCost = (accomRates[formData.accommodation] ?? 0) * parsedTeamSize;
  const previewTotal = primaryCost + additionalCost + accomCost;

  const authoritativeTotal = serverRegistration ? Number(serverRegistration.computed_total_inr) : previewTotal;
  const officialVpa = upiPaymentInfo?.vpa || UPI_CONFIG.vpa;
  const officialPayeeName = upiPaymentInfo?.payee_name || UPI_CONFIG.payeeName;
  const passRef = serverRegistration?.pass_code || 'TR26-PREVIEW';
  const upiUrl = `upi://pay?pa=${encodeURIComponent(officialVpa)}&pn=${encodeURIComponent(officialPayeeName)}&am=${authoritativeTotal}&cu=INR&tn=${encodeURIComponent(passRef)}`;

  // Generate QR locally in-browser (no PII sent to external QR generators)
  useEffect(() => {
    if (!showCheckoutModal || !upiUrl) return;
    let active = true;
    const safeQrPayload = `upi://pay?pa=${encodeURIComponent(officialVpa)}&pn=${encodeURIComponent(officialPayeeName)}&am=${authoritativeTotal}&cu=INR&tn=${encodeURIComponent(passRef)}`;
    QRCode.toDataURL(safeQrPayload, { width: 200, margin: 2 })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        if (active) setQrDataUrl('');
      });
    return () => {
      active = false;
    };
  }, [showCheckoutModal, upiUrl, officialVpa, officialPayeeName, authoritativeTotal, passRef]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      if (name === 'phone') {
        return { ...prev, phone: value.replace(/\D/g, '').slice(0, 10) };
      }
      if (name === 'primaryArena') {
        const nextComp = catalog.find((c) => c.id === value) || catalog[0];
        const nextRange = parseTeamRange(nextComp);
        const curTeam = parseInt(prev.teamSize, 10) || nextRange.min;
        const clamped = Math.min(nextRange.max, Math.max(nextRange.min, curTeam));
        return {
          ...prev,
          primaryArena: value,
          teamSize: String(clamped),
          additionalArenas: prev.additionalArenas.filter((id) => id !== value),
        };
      }
      if (name === 'teamSize') {
        const numeric = parseInt(value, 10) || teamRange.min;
        const clamped = Math.min(teamRange.max, Math.max(teamRange.min, numeric));
        return { ...prev, teamSize: String(clamped) };
      }
      return { ...prev, [name]: value };
    });
  };

  const handleAddArena = () => {
    if (
      additionalSelection &&
      additionalSelection !== formData.primaryArena &&
      !formData.additionalArenas.includes(additionalSelection)
    ) {
      setFormData((prev) => ({
        ...prev,
        additionalArenas: [...prev.additionalArenas, additionalSelection],
      }));
      setAdditionalSelection('');
    }
  };

  const handleRemoveArena = (id) => {
    setFormData((prev) => ({
      ...prev,
      additionalArenas: prev.additionalArenas.filter((a) => a !== id),
    }));
  };

  const handleOpenGateway = async (e) => {
    e.preventDefault();
    setFormError('');
    setModalError('');

    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (cleanPhone.length !== 10) {
      setFormError('Please enter a valid 10-digit WhatsApp / contact phone number.');
      return;
    }

    if (!configured) {
      setFormError('Backend service is not configured (.env missing Supabase URL/Key). Registration cannot be persisted without backend connection.');
      return;
    }

    if (!session) {
      navigate('/signin?redirect=/register');
      return;
    }

    setCreatingReg(true);
    try {
      const idempotencyKey =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `reg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

      const result = await callEdgeFunction('create-registration', {
        method: 'POST',
        body: {
          full_name: formData.fullName.trim(),
          roll_number: formData.rollNumber.trim(),
          phone: cleanPhone,
          college: formData.college.trim(),
          branch: formData.branch.trim(),
          primary_arena_id: formData.primaryArena,
          team_size: parsedTeamSize,
          additional_arena_ids: formData.additionalArenas,
          accommodation_id: formData.accommodation,
          idempotency_key: idempotencyKey,
        },
      });

      setServerRegistration(result.registration);
      setUpiPaymentInfo(result.upi_payment || null);
      setSubmittedPayment(null);
      setUtrNumber('');
      setShowCheckoutModal(true);
      refreshProfile().catch(() => {});
    } catch (err) {
      setFormError(err.message || 'Unable to create registration. Please check your entries.');
    } finally {
      setCreatingReg(false);
    }
  };

  const handleCopyUpi = () => {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(officialVpa).catch(() => {});
    }
    setCopiedUpi(true);
    if (copyTimeoutRef.current) clearTimeout(copyTimeoutRef.current);
    copyTimeoutRef.current = setTimeout(() => setCopiedUpi(false), 2000);
  };

  const handleFinalVerify = async (e) => {
    e.preventDefault();
    setModalError('');
    const cleanUtr = utrNumber.trim();
    if (!cleanUtr || !/^\d{12}$/.test(cleanUtr)) {
      setModalError('Please enter a valid 12-digit numeric UPI UTR / Transaction Reference Number (digits only).');
      return;
    }
    if (!serverRegistration?.id) {
      setModalError('Registration reference missing. Please create registration first.');
      return;
    }

    setSubmittingUtr(true);
    try {
      const res = await callEdgeFunction('submit-utr', {
        method: 'POST',
        body: {
          registration_id: serverRegistration.id,
          utr_number: cleanUtr,
        },
      });
      setSubmittedPayment(res.payment);
    } catch (err) {
      setModalError(err.message || 'UTR submission failed. Please verify the number and try again.');
    } finally {
      setSubmittingUtr(false);
    }
  };

  const teamOptions = useMemo(() => {
    const opts = [];
    for (let i = teamRange.min; i <= teamRange.max; i += 1) {
      opts.push(i);
    }
    return opts;
  }, [teamRange.min, teamRange.max]);

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
                  Fill in your academic and delegation details. Official fee calculation is verified server-side on submission.
                </p>
              </div>

              {configured && !session && (
                <div className="alert alert-dark border-purple text-white d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4" style={{ backgroundColor: 'rgba(190, 0, 215, 0.1)', border: '1px solid rgba(190, 0, 215, 0.45)' }}>
                  <div className="small">
                    Sign in with your delegate account to save your registration and track UPI verification.
                  </div>
                  <Link to="/signin?redirect=/register" className="btn btn-purple btn-sm px-3">
                    Sign In to Register
                  </Link>
                </div>
              )}

              {formError && (
                <div role="alert" className="alert alert-danger mb-4 small">
                  {formError}
                </div>
              )}

              <Form onSubmit={handleOpenGateway}>
                {/* 1. Delegate Personal Details */}
                <h5 className="section-divider-title text-purple mb-3">01 // Delegate Information</h5>
                <Row className="gy-3 mb-4">
                  <Col md={6}>
                    <Form.Group controlId="reg-full-name">
                      <Form.Label className="text-white small">Full Name *</Form.Label>
                      <Form.Control
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleChange}
                        required
                        minLength={2}
                        maxLength={120}
                        placeholder="e.g. Sujal Kumar"
                        className="dark-input"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="reg-roll-number">
                      <Form.Label className="text-white small">University / College Roll Number *</Form.Label>
                      <Form.Control
                        type="text"
                        name="rollNumber"
                        value={formData.rollNumber}
                        onChange={handleChange}
                        required
                        minLength={2}
                        maxLength={40}
                        placeholder="e.g. 24103123001"
                        className="dark-input"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="reg-phone">
                      <Form.Label className="text-white small">WhatsApp / Contact Phone * (10 Digits)</Form.Label>
                      <Form.Control
                        type="tel"
                        name="phone"
                        inputMode="numeric"
                        pattern="\d{10}"
                        maxLength={10}
                        value={formData.phone}
                        onChange={handleChange}
                        required
                        placeholder="e.g. 9876543210"
                        className="dark-input"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="reg-college">
                      <Form.Label className="text-white small">College / University Name *</Form.Label>
                      <Form.Control
                        type="text"
                        name="college"
                        value={formData.college}
                        onChange={handleChange}
                        required
                        minLength={2}
                        maxLength={160}
                        placeholder="e.g. Bhagalpur College of Engineering"
                        className="dark-input"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={12}>
                    <Form.Group controlId="reg-branch">
                      <Form.Label className="text-white small">Branch & Department *</Form.Label>
                      <Form.Control
                        type="text"
                        name="branch"
                        value={formData.branch}
                        onChange={handleChange}
                        required
                        minLength={2}
                        maxLength={120}
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
                    <Form.Group controlId="reg-primary-arena">
                      <Form.Label className="text-white small">Primary Competition / Arena *</Form.Label>
                      <Form.Select
                        name="primaryArena"
                        value={formData.primaryArena}
                        onChange={handleChange}
                        className="dark-input"
                      >
                        {catalog.map((comp) => (
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
                    <Form.Group controlId="reg-team-size">
                      <Form.Label className="text-white small">Team Members in Arena *</Form.Label>
                      <Form.Select
                        name="teamSize"
                        value={String(parsedTeamSize)}
                        onChange={handleChange}
                        className="dark-input"
                      >
                        {teamOptions.map((n) => (
                          <option key={n} value={String(n)}>
                            {n === 1 ? '1 (Solo)' : `${n} Members`}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>

                  {/* Additional Arenas */}
                  <Col md={12}>
                    <Form.Label htmlFor="reg-additional-arena" className="text-white small">Add Additional Competition (Optional)</Form.Label>
                    <div className="d-flex gap-2">
                      <Form.Select
                        id="reg-additional-arena"
                        value={additionalSelection}
                        onChange={(e) => setAdditionalSelection(e.target.value)}
                        className="dark-input"
                      >
                        <option value="">Select another arena...</option>
                        {catalog
                          .filter((c) => c.id !== formData.primaryArena && !formData.additionalArenas.includes(c.id))
                          .map((c) => (
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
                        {formData.additionalArenas.map((aId) => {
                          const c = catalog.find((x) => x.id === aId);
                          return (
                            <Badge
                              key={aId}
                              bg="secondary"
                              className="p-2 d-flex align-items-center gap-2"
                            >
                              <span>{c?.title} ({c?.fee})</span>
                              <button
                                type="button"
                                aria-label={`Remove ${c?.title || aId}`}
                                className="bg-transparent border-0 text-white fw-bold p-0 ms-1 lh-1"
                                style={{ cursor: 'pointer' }}
                                onClick={() => handleRemoveArena(aId)}
                              >
                                ✕
                              </button>
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
                          className="visually-hidden"
                        />
                        <div className="option-title">No Stay Needed</div>
                        <div className="option-price">₹{accomRates.none}</div>
                        <div className="option-desc">Day scholar / local commute</div>
                      </label>

                      <label className={`option-card ${formData.accommodation === 'lodging' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="accommodation"
                          value="lodging"
                          checked={formData.accommodation === 'lodging'}
                          onChange={handleChange}
                          className="visually-hidden"
                        />
                        <div className="option-title">Lodging Only</div>
                        <div className="option-price">₹{accomRates.lodging} / day</div>
                        <div className="option-desc">Bedding & 24/7 security</div>
                      </label>

                      <label className={`option-card ${formData.accommodation === 'mess' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="accommodation"
                          value="mess"
                          checked={formData.accommodation === 'mess'}
                          onChange={handleChange}
                          className="visually-hidden"
                        />
                        <div className="option-title">Mess Dining Only</div>
                        <div className="option-price">₹{accomRates.mess} / day</div>
                        <div className="option-desc">Breakfast, Lunch & Dinner</div>
                      </label>

                      <label className={`option-card ${formData.accommodation === 'both' ? 'selected' : ''}`}>
                        <input
                          type="radio"
                          name="accommodation"
                          value="both"
                          checked={formData.accommodation === 'both'}
                          onChange={handleChange}
                          className="visually-hidden"
                        />
                        <div className="option-title">Full All-Inclusive</div>
                        <div className="option-price text-purple">₹{accomRates.both} / day</div>
                        <div className="option-desc">Hostel + 3 Meals Combo</div>
                      </label>
                    </div>
                  </Col>
                </Row>

                {/* 4. Live Fee Summary & Checkout Trigger */}
                <div className="fee-summary-strip p-4 rounded-3 mb-4 d-flex justify-content-between align-items-center flex-wrap gap-3">
                  <div>
                    <div className="text-white-50 small">ESTIMATED TOTAL (VERIFIED SERVER-SIDE AT CHECKOUT)</div>
                    <div className="total-display text-white fw-bold fs-3">
                      ₹{previewTotal}
                      <span className="fs-6 text-white-50 ms-2">
                        ({parsedTeamSize} Member{parsedTeamSize !== 1 ? 's' : ''})
                      </span>
                    </div>
                  </div>
                  <div>
                    <ButtonWithIcon type="submit" disabled={creatingReg}>
                      {creatingReg ? 'CREATING REGISTRATION...' : 'PROCEED TO PAYMENT GATEWAY'}
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
          {!submittedPayment ? (
            <div>
              {modalError && (
                <div role="alert" className="alert alert-danger small mb-3">
                  {modalError}
                </div>
              )}

              {upiPaymentInfo?.configured === false && (
                <div role="alert" className="alert alert-warning small mb-3">
                  Official institutional UPI VPA is not yet configured on the server. Do not send funds until the verified treasury VPA is published.
                </div>
              )}

              {/* Order Summary */}
              <div className="order-summary-box p-3 rounded-3 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="text-white-50 small">SERVER PASS REFERENCE:</span>
                  <span className="badge bg-purple-glow">{passRef}</span>
                </div>
                <div className="summary-row d-flex justify-content-between small py-1">
                  <span className="text-white-50">Participant:</span>
                  <span className="text-white fw-bold">{serverRegistration?.full_name || formData.fullName}</span>
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
                  <span>SERVER VERIFIED PAYABLE:</span>
                  <span className="text-purple fs-5">₹{authoritativeTotal}</span>
                </div>
              </div>

              {/* Local Offline QR & UPI Intent */}
              <div className="text-center mb-4">
                {qrDataUrl && (
                  <div className="qr-box p-3 bg-white rounded-3 d-inline-block mb-3">
                    <img src={qrDataUrl} alt="UPI Payment QR Code" width="180" height="180" />
                  </div>
                )}
                <div className="upi-id-box d-flex align-items-center justify-content-center gap-2 mb-2">
                  <span className="text-white-50 small">OFFICIAL UPI VPA:</span>
                  <code className="text-purple fw-bold bg-dark px-2 py-1 rounded">{officialVpa}</code>
                  <Button
                    variant="outline-light"
                    size="sm"
                    onClick={handleCopyUpi}
                    className="py-0 px-2"
                  >
                    {copiedUpi ? '✓ Copied' : 'Copy'}
                  </Button>
                </div>
                <div className="small text-white-50 mb-3">Payee: {officialPayeeName}</div>
                <a
                  href={upiUrl}
                  className="btn btn-purple btn-sm px-4 py-2 w-100"
                >
                  📱 Pay via Any UPI App (GPay / PhonePe / Paytm / BHIM)
                </a>
              </div>

              {/* UTR Input Form */}
              <Form onSubmit={handleFinalVerify}>
                <Form.Group controlId="reg-utr-number" className="mb-3">
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
                    Submitting your UTR sets status to PENDING VERIFICATION until reconciled by the accounts desk.
                  </Form.Text>
                </Form.Group>

                <div className="d-flex justify-content-between gap-2">
                  <Button
                    variant="outline-secondary"
                    onClick={() => setShowCheckoutModal(false)}
                    className="w-50"
                  >
                    Pay Later (Saved)
                  </Button>
                  <Button
                    variant="purple"
                    type="submit"
                    disabled={submittingUtr}
                    className="w-50"
                  >
                    {submittingUtr ? 'SUBMITTING UTR...' : 'SUBMIT UTR FOR VERIFICATION'}
                  </Button>
                </div>
              </Form>
            </div>
          ) : (
            /* Pending Verification Receipt Screen */
            <div className="text-center py-3">
              <div className="success-icon mb-3">⏳</div>
              <h4 className="text-white fw-bold mb-2">UTR Submitted — Pending Verification</h4>
              <p className="text-white-50 small mb-4">
                Thank you, <strong>{serverRegistration?.full_name}</strong>. Your UTR for{' '}
                <strong>{primaryComp.title}</strong> has been recorded and queued for bank reconciliation:
              </p>
              <div className="p-3 bg-dark rounded-3 border border-purple mb-4">
                <div className="small text-white-50">REGISTRATION REFERENCE ID:</div>
                <div className="fs-4 text-purple fw-bold">{passRef}</div>
                <div className="small text-white-50 mt-1">
                  UTR: {submittedPayment.utr_number} • Status: PENDING VERIFICATION
                </div>
              </div>
              <div className="d-flex gap-2 justify-content-center flex-wrap">
                <Link
                  to="/dashboard"
                  className="btn btn-purple px-4"
                  onClick={() => setShowCheckoutModal(false)}
                >
                  Open My Dashboard
                </Link>
                <Button
                  variant="outline-light"
                  onClick={() => window.print()}
                  className="px-4"
                >
                  🖨 Print Slip
                </Button>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Register;
