import React from 'react';
import { Container } from 'react-bootstrap';
import faqs from '../content/faq';
import "./Faq.scss";
import OneFaqQuestionHome from "./One_faq_question_home";

const Faq = ({ className }) => {
  const faqitems = faqs.map((faq, i) => (
    <OneFaqQuestionHome
      heading={faq.question}
      body={faq.answer}
      id={i}
      key={i}
    />
  ));

  return (
    <div className={`faq-wrapper homeac ${className || ''}`}>
      <Container>
        <div className="faq homeac">
          <h1 className="faq-heading">
            Faq<span className="dot_color">.</span>
          </h1>
          <div className="accordion accordion-flush homeac" id="accordionExample">
            {faqitems}
          </div>
        </div>
      </Container>
    </div>
  );
};

export default Faq;
