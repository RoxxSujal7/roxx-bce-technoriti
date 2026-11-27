import "./event_card.scss";
import { useNavigate } from "react-router-dom";
import OneFaqQuestion from "./One_faq_question";
import eventmap from "../content/events";
import { Row, Col } from "react-bootstrap";
import ButtonWithIcon from "./ui/ButtonWithIcon";

const getCategoryIconSvg = (categoryId) => {
    switch (categoryId) {
        case "robotics":
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="#00ffff" strokeWidth="1.8" className="sideimg-icon">
                    <rect x="3" y="11" width="18" height="10" rx="2" />
                    <circle cx="8.5" cy="16" r="1.5" fill="#00ffff" />
                    <circle cx="15.5" cy="16" r="1.5" fill="#00ffff" />
                    <path d="M12 2v5M8 7h8" strokeLinecap="round" />
                    <line x1="12" y1="18" x2="12" y2="18.01" strokeWidth="3" />
                </svg>
            );
        case "coding":
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="#00ff88" strokeWidth="1.8" className="sideimg-icon">
                    <polyline points="16 18 22 12 16 6" />
                    <polyline points="8 6 2 12 8 18" />
                    <line x1="14" y1="4" x2="10" y2="20" strokeLinecap="round" />
                </svg>
            );
        case "gaming":
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="#BE00D7" strokeWidth="1.8" className="sideimg-icon">
                    <rect x="2" y="6" width="20" height="12" rx="6" />
                    <line x1="6" y1="12" x2="10" y2="12" />
                    <line x1="8" y1="10" x2="8" y2="14" />
                    <circle cx="15" cy="11" r="1" fill="#ffffff" />
                    <circle cx="17" cy="13" r="1" fill="#ffffff" />
                </svg>
            );
        case "design":
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8" className="sideimg-icon">
                    <polygon points="12 2 2 22 22 22" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="16" x2="16" y2="16" />
                </svg>
            );
        case "quizzes":
        default:
            return (
                <svg viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.8" className="sideimg-icon">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                    <line x1="12" y1="17" x2="12.01" y2="17" strokeWidth="2.5" />
                </svg>
            );
    }
};

function EventCard(props) {
    const navigate = useNavigate();
    const mp = eventmap[props.eventid] || eventmap["1"];
    if (!mp) return null;

    const faqitems = [];
    if (mp.faqques && mp.faqans) {
        for (let i = 0; i < mp.faqques.length; i++) {
            faqitems.push(
                <OneFaqQuestion
                    heading={mp.faqques[i]}
                    body={mp.faqans[i]}
                    id={`${props.eventid}-${i}`}
                    key={i}
                />
            );
        }
    }

    const handleRegisterClick = () => {
        navigate(`/register?arena=${encodeURIComponent(mp.id)}`);
    };

    return (
        <div className="EventCard container">
            <div className="row align-items-center">
                <div className="col-lg-4 col-md-5 d-none d-md-block imagecol">
                    <div className="sideimg-box">
                        {getCategoryIconSvg(mp.category_id)}
                        <div className="sideimg-tag">{mp.title}</div>
                        <div className="sideimg-sub">{mp.category || "Competition"}</div>
                    </div>
                </div>

                <div className="col-lg-8 col-md-7 col-12">
                    <div className="title_row">
                        <span>{mp.title}</span>
                        {mp.category && <span className="event-category-badge">{mp.category}</span>}
                    </div>

                    <div className="d-block d-md-none mb-3 text-center">
                        <div className="sideimg-box mx-auto" style={{ maxWidth: "260px", minHeight: "200px" }}>
                            {getCategoryIconSvg(mp.category_id)}
                            <div className="sideimg-tag" style={{ fontSize: "1.1rem" }}>{mp.title}</div>
                        </div>
                    </div>

                    {/* Metadata highlights grid */}
                    <div className="event-meta-grid">
                        <Row>
                            <Col sm={6} xs={12}>
                                <div className="meta-box">
                                    <div className="meta-label">Prize Pool</div>
                                    <div className="meta-val prize-highlight">{mp.prize_pool || "₹5,000"} <span style={{ fontSize: "0.8rem", color: "#aaaaaa" }}>(1st: {mp.first_prize} | 2nd: {mp.second_prize})</span></div>
                                </div>
                            </Col>
                            <Col sm={6} xs={12}>
                                <div className="meta-box">
                                    <div className="meta-label">Team & Registration Fee</div>
                                    <div className="meta-val">{mp.team_size || "1–4 Members"} • <span style={{ color: "#00ffff" }}>{mp.fee || "₹50/member"}</span></div>
                                </div>
                            </Col>
                            <Col sm={6} xs={12}>
                                <div className="meta-box">
                                    <div className="meta-label">Venue & Timing</div>
                                    <div className="meta-val">{mp.venue || "BCE Bhagalpur"} • {mp.event_time}</div>
                                </div>
                            </Col>
                            <Col sm={6} xs={12}>
                                <div className="meta-box">
                                    <div className="meta-label">Student Coordinators</div>
                                    <div className="meta-val">{mp.coordinator} <span style={{ fontSize: "0.8rem", color: "#aaaaaa" }}>({mp.coordinator_phone})</span></div>
                                </div>
                            </Col>
                        </Row>
                    </div>

                    <div className="row">
                        <div className="event_desc">
                            {mp.desc}
                        </div>

                        {faqitems.length > 0 && (
                            <div className="accordion accordion-flush eventac px-4" id={`accordion-${props.eventid}`}>
                                {faqitems}
                            </div>
                        )}
                    </div>

                    <div className="row btn-row justify-content-center">
                        <ButtonWithIcon onClick={handleRegisterClick}>
                            Register for {mp.title}
                        </ButtonWithIcon>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EventCard;
