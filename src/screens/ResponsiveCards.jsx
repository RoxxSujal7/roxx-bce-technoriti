import { Row } from "react-bootstrap";
import "./ResponsiveCards.scss";
import Card from "../components/Card";

const ResponsiveCards = (props) => {
    return (
        <Row className="justify-content-center">
            {props.cards.map((card, idx) => (
                <div key={idx} className="card-body col-12 col-sm-6 col-md-4 col-lg-3 d-flex justify-content-center">
                    <Card {...card} content={card.name || card.content} />
                </div>
            ))}
        </Row>
    );
};

export default ResponsiveCards;
