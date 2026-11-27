import './Title_Jumbotron.scss';
import { BsArrowDownCircle } from 'react-icons/bs';

const Title_Jumbotron = (props) => {
    const slideDown = () => {
        window.scrollTo({
            top: window.innerHeight / 2,
            behavior: 'smooth'
        });
    }
    return <div className='container-fluid title_background'>
        <div className="row title_tex">
            <div className="col-12 col-md-10 col-lg-8">
                <div className="empty_space_title">
                </div>
                <div className="row synergy_is">
                    <h1 className='synergy_is_text'>
                        {props.bigHeader}
                        {props.bigHeaderCaps ? <span className='visually-hidden'> {props.bigHeaderCaps}</span> : null}
                    </h1>
                </div>
                <div className="row back_dot" aria-hidden="true">
                    <div className='back_dot_text'>{props.bigHeaderCaps}<span className='dot_color'>.</span></div>
                </div>

                <div className="row intro_text">
                    <div className="col d-block col-md-8">
                        <div className='introtextpara'>
                            {props.subtitle}
                        </div>
                    </div>
                    <div className="col-md-4 d-none d-md-block spacecol"></div>
                </div>
            </div>
            <div className="col d-none d-md-block">
            </div>
        </div>
        <div className="row icon-bt-row position-absolute bottom-0 start-50 translate-middle">
            <div className="col"></div>
            <div className="col icon_col">
                <button
                    type="button"
                    className="down_arrow_icon_span bg-transparent border-0 p-0"
                    onClick={slideDown}
                    aria-label="Scroll down to explore"
                >
                    <BsArrowDownCircle className='down_arrow_icon' aria-hidden="true" />
                </button>
            </div>
            <div className="col"></div>
        </div>
    </div>
}

export default Title_Jumbotron;