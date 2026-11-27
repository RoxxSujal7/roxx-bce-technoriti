import { useCallback, useMemo, useState } from 'react';
import './App.scss';
import TitleJumbotron from './components/Title_Jumbotron';
import SliderSection from './components/slider_section';
import BigSideHeading from './components/big_side_heading';
import about_us_text from './content/about_us';
import Faq from './components/Faq';
import { homepage_subtitle } from './content/subtitle_texts';
import { HaloReel } from './components/HaloReel';
import { getHaloReelItems } from './content/events';
import ButtonWithIcon from './components/ui/ButtonWithIcon';

function HaloFeaturedShowcase() {
  const haloItems = useMemo(() => getHaloReelItems(), []);
  const [activeArena, setActiveArena] = useState(haloItems[0] || null);
  const handleActiveArenaChange = useCallback((item) => {
    setActiveArena(item);
  }, []);

  return (
    <div className="row approw halo-featured-section py-5">
      <div className="container-fluid px-3 px-md-5">
        <div className="d-flex justify-content-between align-items-end mb-4 flex-wrap" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", paddingBottom: "1.2rem" }}>
          <div>
            <div style={{ color: "#e879f9", fontWeight: 700, letterSpacing: "3px", textTransform: "uppercase", fontSize: "0.85rem", marginBottom: "6px" }}>
              3D Interactive Showcase
            </div>
            <h2 className="wrapper__heading" style={{ margin: 0, fontSize: "clamp(2rem, 5vw, 3.5rem)" }}>
              Featured Arenas<span className="dot_color">.</span>
            </h2>
          </div>
          <div className="mt-3 mt-md-0">
            <ButtonWithIcon to="/events">
              Explore All 29 Arenas
            </ButtonWithIcon>
          </div>
        </div>
        <div className="halo-stage-wrapper">
          <HaloReel
            items={haloItems}
            cardWidth={200}
            cardHeight={280}
            radiusXRatio={0.46}
            radiusYRatio={0.35}
            centerXRatio={0.04}
            spread={1.2}
            minScale={0.44}
            onActiveItemChange={handleActiveArenaChange}
            centerLabel={
              <div style={{ textAlign: "center", pointerEvents: "none", maxWidth: "460px" }}>
                {activeArena?.subtitle && (
                  <div
                    style={{
                      color: "#00ffff",
                      fontSize: "0.85rem",
                      fontWeight: 700,
                      letterSpacing: "3px",
                      textTransform: "uppercase",
                      marginBottom: "8px",
                    }}
                  >
                    {activeArena.subtitle}
                  </div>
                )}
                <div
                  style={{
                    color: "#e879f9",
                    fontWeight: 800,
                    fontSize: "clamp(1.4rem, 3.2vw, 2.4rem)",
                    letterSpacing: "1.5px",
                    textTransform: "uppercase",
                    fontFamily: "'Poppins', sans-serif",
                    lineHeight: "1.2",
                    textShadow: "0 2px 16px rgba(0,0,0,0.85)",
                    minHeight: "2.4em",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {activeArena?.title || "TECHNORITI '26"}
                </div>
                <div
                  style={{
                    color: "rgba(255, 255, 255, 0.78)",
                    fontSize: "0.85rem",
                    letterSpacing: "2px",
                    marginTop: "10px",
                    textTransform: "uppercase",
                  }}
                >
                  29 TECHNICAL ARENAS · DRAG / SCROLL TO ROTATE
                </div>
              </div>
            }
          />
        </div>

        {/* Mobile Dynamic Arena Title (visible only on viewports < 640px) */}
        <div className="d-block d-sm-none text-center my-3 px-2">
          {activeArena?.subtitle && (
            <div style={{ color: "#00ffff", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "2px", textTransform: "uppercase" }}>
              {activeArena.subtitle}
            </div>
          )}
          <h3 style={{ color: "#e879f9", fontWeight: 800, fontFamily: "'Poppins', sans-serif", textTransform: "uppercase", margin: "4px 0" }}>
            {activeArena?.title || "TECHNORITI '26"}
          </h3>
          <div style={{ color: "rgba(255,255,255,0.75)", fontSize: "0.7rem", letterSpacing: "1.5px", textTransform: "uppercase" }}>
            29 TECHNICAL ARENAS · DRAG / SCROLL TO ROTATE
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="App container-fluid appcont" >
      <div className="col appcol">
          <div className="row approw">
          <TitleJumbotron bigHeader={"TECHNORITI"} bigHeaderCaps={"'26"} subtitle={homepage_subtitle} />
          </div>
          <div className="row approw">
          <SliderSection />
          </div>

          <HaloFeaturedShowcase />

          <div className="row approw about_us_section">
          <BigSideHeading
            heading1="About"
            heading2="Us"
            content={about_us_text}
            className='about_us_container'
          ></BigSideHeading>
          </div>
          <div className="row approw">
          <Faq className ='homepage_faq'/>
          </div>
          <div className='emptybox'></div>
      </div>
      {/* <Speakers title={"Speakers"} /> */}
    </div>
  );
}

export default App;
