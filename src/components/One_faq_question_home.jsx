import "./One_faq_question_home.scss";

function OneFaqQuestionHome(props) {
  const headingid = "heading" + props.id;
  const divid = "collapse" + props.id;
  return (
    <div className="accordion-item homeac">
      <div className="accordion-header container homeac" id={headingid}>
        <button
          type="button"
          className="accordion-button collapsed acbtn homeacbtn"
          data-bs-toggle="collapse"
          data-bs-target={"#" + divid}
          aria-expanded="false"
          aria-controls={divid}
        >
          {props.heading}
        </button>
      </div>
      <div
        id={divid}
        className="accordion-collapse collapse acc homeac"
        aria-labelledby={headingid}
        data-bs-parent="#accordionExample"
      >
        <div className="accordion-body acbdy homeac">
          <p>{props.body}</p>
        </div>
      </div>
    </div>
  );
}

export default OneFaqQuestionHome;
