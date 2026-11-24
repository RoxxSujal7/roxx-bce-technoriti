import './Comingsoon.scss';
import { AiFillInstagram } from "react-icons/ai";
import { BsLinkedin } from "react-icons/bs";
import { FaTwitter, FaYoutube } from "react-icons/fa";

function Comingsoon() {
    return (
        <div className="container-fluid title_background1">
            <div className="row">
                <div className="empty_space_title1"></div>
                <div className="col-1 col-lg-2"></div>
                <div className="col-11 col-lg-4">
                    <h1 className="topcoming">TECHNORITI '26 is</h1>
                </div>
                <div className="col d-none d-lg-block"> </div>
            </div>
            <div className="row">
                <div className="col-2 d-none d-lg-block"></div>
                <div className="col-12 col-lg-4">
                    <h1 className='synergy_is_text1 textcenter'>COMING</h1>
                </div>
                <div className="col-4 d-none d-lg-block">
                    <h1 className='synergy_is_text2'>SOON</h1>
                </div>
                <div className="col-2 d-none d-lg-block"></div>
            </div>
            <div className="row d-block d-lg-none">
                <h1 className='synergy_is_text2 textcenter'>SOON</h1>
            </div>
            <div className="row">
                <div className="col-4 col-lg-6"></div>
                <div className="col-7 col-lg-4 desc">BCE Bhagalpur's</div>
                <div className="col-2"></div>
            </div>
            <div className="row">
                <div className="col-4 col-lg-6"></div>
                <div className="col-7 col-lg-4 desc">Premier Technical Festival</div>
                <div className="col-2"></div>
            </div>
            <div className="row empty_space_title1">
            </div>
            <div className="row mobilesocial">
                <h6 className="textcenter contactuscom">Contact us here</h6>
            </div>
            <div className="row textcenter socialrow mobilesocial">
                <div className="col-2 col-lg"></div>
                <div className="col-2 col-lg-1">
                    <a href="https://linkedin.com/in/bhagalpur-college-of-engineering-897354228" target="_blank" rel="noreferrer" title="LinkedIn" className="footer-icon socialrow">
                        <BsLinkedin style={{ color: "white", fontSize: "2.3em" }} className="ra-icon" />
                    </a>
                </div>
                <div className="col-2 col-lg-1">
                    <a href="https://instagram.com/bcebhagalpur_official" target="_blank" rel="noreferrer" title="Instagram" className="footer-icon socialrow">
                        <AiFillInstagram style={{ color: "white", fontSize: "2.5em" }} className="ra-icon" />
                    </a>
                </div>
                <div className="col-2 col-lg-1">
                    <a href="https://twitter.com/bcebhagalpur" target="_blank" rel="noreferrer" title="Twitter / X" className="footer-icon socialrow">
                        <FaTwitter style={{ color: "white", fontSize: "2.3em" }} className="ra-icon" />
                    </a>
                </div>
                <div className="col-2 col-lg-1">
                    <a href="https://www.youtube.com/@bcebhagalpurofficial" target="_blank" rel="noreferrer" title="YouTube" className="footer-icon socialrow">
                        <FaYoutube style={{ color: "white", fontSize: "2.3em" }} className="ra-icon" />
                    </a>
                </div>
                <div className="col-2 col-lg"></div>
            </div>
        </div>
    );
}

export default Comingsoon;
