import { useState, useMemo, useEffect } from "react";
import TitleJumbotron from "../components/Title_Jumbotron";
import { events_page_subtitle } from '../content/subtitle_texts';
import EventCard from "../components/event_card";
import { competitionsList, getLensSlides, getCinematicItems } from "../content/events";
import CurvedLensCarousel from "../components/CurvedLensCarousel";
import ButtonWithIcon from "../components/ui/ButtonWithIcon";
import { CinematicList } from "../components/CinematicList";
import { Container } from "react-bootstrap";
import './Events.scss';

const CATEGORIES = [
    { id: "all", label: "All Competitions" },
    { id: "robotics", label: "Robotics & Hardware" },
    { id: "coding", label: "Coding & Cyber" },
    { id: "gaming", label: "Esports & Gaming" },
    { id: "design", label: "Design & Civil" },
    { id: "quizzes", label: "Quizzes & Literary" },
];

function Events() {
    const [selectedCategory, setSelectedCategory] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [debouncedQuery, setDebouncedQuery] = useState("");
    const [viewMode, setViewMode] = useState("cinematic"); // 'cinematic' | 'carousel'
    const [currentIndex, setCurrentIndex] = useState(0);
    const [selectedCompId, setSelectedCompId] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(searchQuery), 160);
        return () => clearTimeout(timer);
    }, [searchQuery]);

    const filteredCompetitions = useMemo(() => {
        const q = debouncedQuery.trim().toLowerCase();
        return competitionsList.filter((comp) => {
            const matchesCategory =
                selectedCategory === "all" || comp.category_id === selectedCategory;
            const matchesSearch =
                q === "" ||
                comp.title.toLowerCase().includes(q) ||
                comp.desc.toLowerCase().includes(q) ||
                comp.category.toLowerCase().includes(q);
            return matchesCategory && matchesSearch;
        });
    }, [selectedCategory, debouncedQuery]);

    const cinematicItems = useMemo(() => {
        return getCinematicItems(filteredCompetitions);
    }, [filteredCompetitions]);

    const lensSlides = useMemo(() => {
        return getLensSlides(filteredCompetitions);
    }, [filteredCompetitions]);

    // Reset slide index & selected event when category or search changes
    useEffect(() => {
        setCurrentIndex(0);
        setSelectedCompId(null);
    }, [selectedCategory, debouncedQuery]);

    // Keep currentIndex valid for carousel
    useEffect(() => {
        if (filteredCompetitions.length > 0 && currentIndex >= filteredCompetitions.length) {
            setCurrentIndex(filteredCompetitions.length - 1);
        }
    }, [filteredCompetitions.length, currentIndex]);

    const currentComp = filteredCompetitions[currentIndex];
    const selectedComp = selectedCompId
        ? filteredCompetitions.find((c) => c.id === selectedCompId)
        : null;

    return (
        <div className="Events">
            <TitleJumbotron
                bigHeader={"Discover"}
                bigHeaderCaps={"TECHNORITI '26"}
                subtitle={events_page_subtitle}
            />

            <Container className="events-filter-section">
                {/* View Mode Selector: Exactly Two Modes */}
                <div className="view-mode-selector-wrap mb-4">
                    <div className="view-mode-selector" role="group" aria-label="Event display mode">
                        <button
                            type="button"
                            className={`view-mode-btn ${viewMode === 'cinematic' ? 'active' : ''}`}
                            onClick={() => setViewMode('cinematic')}
                            aria-pressed={viewMode === 'cinematic'}
                        >
                            <span className="btn-icon">☰</span> CINEMATIC LIST
                        </button>
                        <button
                            type="button"
                            className={`view-mode-btn ${viewMode === 'carousel' ? 'active' : ''}`}
                            onClick={() => setViewMode('carousel')}
                            aria-pressed={viewMode === 'carousel'}
                        >
                            <span className="btn-icon">⇄</span> CURVED LENS
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="search-input-wrap mb-4">
                    <input
                        type="text"
                        placeholder="Search 29 competitions (e.g. RoboWar, Hackathon, AutoCAD, Quiz)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Search competitions"
                    />
                </div>

                {/* Category Pills */}
                <div className="filter-pills-container" role="group" aria-label="Competition categories">
                    {CATEGORIES.map((cat) => {
                        const count =
                            cat.id === "all"
                                ? competitionsList.length
                                : competitionsList.filter((c) => c.category_id === cat.id).length;
                        return (
                            <button
                                key={cat.id}
                                type="button"
                                aria-pressed={selectedCategory === cat.id}
                                className={`filter-pill ${selectedCategory === cat.id ? "active" : ""}`}
                                onClick={() => setSelectedCategory(cat.id)}
                            >
                                {cat.label} ({count})
                            </button>
                        );
                    })}
                </div>

                <div className="events-count-badge" aria-live="polite">
                    Showing {filteredCompetitions.length} of {competitionsList.length} Technical Competitions
                    {viewMode === "cinematic" && (
                        <span className="cinematic-view-hint" style={{ color: "#e879f9", fontWeight: 600 }}> • Expandable Rows • Hover / Tap to preview</span>
                    )}
                    {viewMode === "carousel" && filteredCompetitions.length > 0 && (
                        <span className="carousel-view-hint"> • Curved Lens WebGL • Drag / Flick / Scroll wheel</span>
                    )}
                </div>
            </Container>

            {/* Competitions View */}
            {filteredCompetitions.length === 0 ? (
                <Container className="text-center py-5">
                    <h4 style={{ color: "#aaaaaa" }}>No competitions found matching "{searchQuery}".</h4>
                    <ButtonWithIcon
                        className="mt-3"
                        onClick={() => {
                            setSelectedCategory("all");
                            setSearchQuery("");
                        }}
                    >
                        Reset Filters
                    </ButtonWithIcon>
                </Container>
            ) : viewMode === "cinematic" ? (
                /* CINEMATIC LIST VIEW (Authoritative Daiwiik Harihar component) */
                <Container className="cinematic-view-container pb-5">
                    <CinematicList
                        items={cinematicItems}
                        selectedId={selectedCompId}
                        onItemSelect={(item) =>
                            setSelectedCompId((prev) => (prev === item.rawId ? null : item.rawId))
                        }
                    />

                    {/* Selected Competition Detail Drawer / Card */}
                    {selectedComp && (
                        <div className="cinematic-selected-detail mt-5">
                            <div
                                className="d-flex justify-content-between align-items-center mb-4 flex-wrap"
                                style={{
                                    borderBottom: "1px solid rgba(255,255,255,0.15)",
                                    paddingBottom: "1rem"
                                }}
                            >
                                <div>
                                    <span style={{ color: "#00ffff", fontSize: "0.85rem", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700 }}>
                                        Selected Competition • Full Rules & Registration
                                    </span>
                                    <h2 style={{ color: "#ffffff", margin: "4px 0 0 0", fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>
                                        {selectedComp.title}
                                    </h2>
                                </div>
                                <button
                                    className="btn btn-sm btn-outline-light mt-2 mt-md-0"
                                    onClick={() => setSelectedCompId(null)}
                                    style={{
                                        borderRadius: "20px",
                                        padding: "6px 18px",
                                        borderColor: "rgba(255,255,255,0.3)"
                                    }}
                                >
                                    ✕ Close Details
                                </button>
                            </div>
                            <div className="selected-event-card-wrap">
                                <EventCard eventid={selectedComp.id} key={selectedComp.id} />
                            </div>
                        </div>
                    )}
                </Container>
            ) : (
                /* CurvedLensCarousel WebGL View */
                <div className="curved-lens-carousel-section pb-5">
                    <div
                        className="curved-lens-viewport"
                        style={{
                            position: "relative",
                            width: "100%",
                            height: "72vh",
                            minHeight: "560px",
                            maxHeight: "780px",
                            overflow: "hidden",
                            borderTop: "1px solid rgba(255,255,255,0.1)",
                            borderBottom: "1px solid rgba(255,255,255,0.1)"
                        }}
                    >
                        <CurvedLensCarousel
                            slides={lensSlides}
                            label="TECHNORITI '26"
                            bend={0.55}
                            background="#040208"
                            ink="#ffffff"
                            height="100%"
                            onChange={(idx) => setCurrentIndex(idx)}
                        />
                    </div>

                    {currentComp && (
                        <Container className="mt-5">
                            <div
                                className="d-flex justify-content-between align-items-center mb-4 flex-wrap"
                                style={{
                                    borderBottom: "1px solid rgba(255,255,255,0.1)",
                                    paddingBottom: "1rem"
                                }}
                            >
                                <div>
                                    <span style={{ color: "#00ffff", fontSize: "0.85rem", letterSpacing: "1.5px", textTransform: "uppercase", fontWeight: 700 }}>
                                        Active Selected Arena • {currentIndex + 1} of {filteredCompetitions.length}
                                    </span>
                                    <h2 style={{ color: "#ffffff", margin: "4px 0 0 0", fontWeight: 800, fontFamily: "'Poppins', sans-serif" }}>
                                        {currentComp.title}
                                    </h2>
                                </div>
                                <div className="text-muted small mt-2 mt-md-0">
                                    <span style={{ color: "rgba(255,255,255,0.7)" }}>Controls:</span> Drag WebGL canvas • Scroll wheel / trackpad • Arrow keys [←] [→]
                                </div>
                            </div>
                            <div className="carousel-active-card-wrap">
                                <EventCard eventid={currentComp.id} key={currentComp.id} />
                            </div>
                        </Container>
                    )}
                </div>
            )}

            <div className='emptybox'></div>
        </div>
    );
}

export default Events;