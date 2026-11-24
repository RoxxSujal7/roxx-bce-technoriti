import "./Card.scss";
import { BsLinkedin } from "react-icons/bs";
import { Row, Col } from "react-bootstrap";

const getInitials = (name) => {
    if (!name) return "TR";
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const Card = (props) => {
    const displayName = props.name || props.content || "Technoriti Lead";
    const role = props.role || "Coordinator";
    const department = props.department || "BCE Bhagalpur";
    const linkedinUrl = props.linkedin || "https://linkedin.com/in/bhagalpur-college-of-engineering-897354228";

    return (
        <div className="card-main">
            <div className="cont">
                {props.img ? (
                    <img className="cardimg" src={props.img} alt={displayName} />
                ) : (
                    <div className="card-avatar-placeholder">
                        <span className="avatar-initials">{getInitials(displayName)}</span>
                        <span className="avatar-bce-badge">BCE Bhagalpur</span>
                    </div>
                )}
                <Row className="align-items-center mt-2">
                    <Col xs={9}>
                        <p className="team-title" title={displayName}>{displayName}</p>
                    </Col>
                    <Col xs={3} className="text-end">
                        <a href={linkedinUrl} target="_blank" rel="noreferrer" className="footer-icon">
                            <BsLinkedin style={{ color: "white", fontSize: "1.4em" }} className="ra-icon" />
                        </a>
                    </Col>
                </Row>
                <div className="second-name">
                    <p className="team-subtitle">{role}</p>
                    <p className="team-dept">{department}</p>
                </div>
            </div>
        </div>
    );
};

export default Card;
