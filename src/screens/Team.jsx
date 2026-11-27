import TitleJumbotron from "../components/Title_Jumbotron";
import { team_page_subtitle } from '../content/subtitle_texts';
import "./Team.scss";
import { Container } from "react-bootstrap";
import ResponsiveCards from "./ResponsiveCards";
import { teams, digitalVision } from "../content/teams";

const Teams = () => {
    const patronGroup = teams.find(t => t.group.includes("Patron"));
    const studentGroup = teams.find(t => t.group.includes("Student"));

    return (
        <div className="Teams">
            <TitleJumbotron bigHeader={"Meet the Team"} bigHeaderCaps={"TECHNORITI '26"} subtitle={team_page_subtitle} />

            {/* Patrons & Faculty Leadership */}
            {patronGroup && (
                <Container className="wrapper my-5">
                    <h2 className="wrapper__heading mb-4">{patronGroup.group}<span className="dot_color">.</span></h2>
                    <ResponsiveCards cards={patronGroup.list} />
                </Container>
            )}

            {/* The Person Behind the Digital Vision */}
            <Container className="wrapper my-5 digital-vision-section">
                <div className="digital-vision-card">
                    <div className="digital-vision-header">
                        <span className="digital-vision-badge">ATTRIBUTION</span>
                        <h2 className="digital-vision-title">{digitalVision.title}</h2>
                    </div>
                    <div className="digital-vision-body">
                        <h1 className="digital-vision-name">{digitalVision.name}</h1>
                        <div className="digital-vision-meta">
                            <span className="digital-vision-dept">{digitalVision.department}</span>
                            <span className="digital-vision-divider">•</span>
                            <span className="digital-vision-batch">Batch {digitalVision.batch}</span>
                        </div>
                        <div className="digital-vision-inst">{digitalVision.institution}</div>
                    </div>
                </div>
            </Container>

            {/* Student Leadership & Coordinators */}
            {studentGroup && (
                <Container className="wrapper my-5">
                    <h1 className="wrapper__heading mb-4">{studentGroup.group}<span className="dot_color">.</span></h1>
                    <ResponsiveCards cards={studentGroup.list} />
                </Container>
            )}

            <div className='emptybox'></div>
        </div>
    );
};

export default Teams;
