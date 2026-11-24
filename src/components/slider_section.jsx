import './slider_section.scss';
import slider_text from '../content/slider_texts';
import { useState, useRef, useEffect } from 'react';

/**
 * useInfiniteScroll - Restores the exact original Technoriti slider movement
 * Original Git pace formula:
 * a * 10 * (window.innerWidth / 1920) every 50ms (from commit e5de6c8)
 * = a * 200 * (window.innerWidth / 1920) px per second.
 *
 * At 1920px: 400 px/s (direction 1 = left, -1 = right)
 * At 1440px: 300 px/s
 * At 768px:  160 px/s
 * At 375px:  78 px/s
 *
 * Implements seamless continuous wrap-around using duplicated content,
 * frame-rate independent requestAnimationFrame, pause on hover, touch/drag support,
 * and prefers-reduced-motion compliance.
 */
function useInfiniteScroll(direction = 1) {
  const containerRef = useRef(null);
  const isPausedRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onEnter = () => { isPausedRef.current = true; };
    const onLeave = () => { isPausedRef.current = false; };

    el.addEventListener('mouseenter', onEnter);
    el.addEventListener('mouseleave', onLeave);
    el.addEventListener('touchstart', onEnter, { passive: true });
    el.addEventListener('touchend', onLeave, { passive: true });

    let rafId;
    let lastTime = performance.now();
    let hasInitializedRight = false;

    const animate = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Handle initialization for rightward moving track
      if (direction === -1 && !hasInitializedRight && el.scrollWidth > el.clientWidth) {
        el.scrollLeft = el.scrollWidth / 2;
        hasInitializedRight = true;
      }

      const prefersReducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      if (!isPausedRef.current && !prefersReducedMotion && dt > 0 && dt < 0.2) {
        // Authentic speed scaling from original repository
        const screenScale = window.innerWidth / 1920;
        const speed = 400 * screenScale; // px per second
        const halfWidth = el.scrollWidth / 2;

        if (halfWidth > 0) {
          if (direction === 1) {
            // Row 1 & 3: Moving leftwards (scrollLeft increases)
            el.scrollLeft += speed * dt;
            if (el.scrollLeft >= halfWidth) {
              el.scrollLeft -= halfWidth;
            }
          } else {
            // Row 2: Moving rightwards (scrollLeft decreases)
            el.scrollLeft -= speed * dt;
            if (el.scrollLeft <= 0) {
              el.scrollLeft += halfWidth;
            }
          }
        }
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      el.removeEventListener('mouseenter', onEnter);
      el.removeEventListener('mouseleave', onLeave);
      el.removeEventListener('touchstart', onEnter);
      el.removeEventListener('touchend', onLeave);
    };
  }, [direction]);

  return {
    ref: containerRef,
    onMouseEnter: () => { isPausedRef.current = true; },
    onMouseLeave: () => { isPausedRef.current = false; },
    onTouchStart: () => { isPausedRef.current = true; },
    onTouchEnd: () => { isPausedRef.current = false; },
  };
}

const Slider_section = () => {
  const [text_list] = useState(slider_text);

  const giveRandomizedHeaderLst = () => {
    const randomizedHeaderLst = [...text_list];
    for (let i = randomizedHeaderLst.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [randomizedHeaderLst[i], randomizedHeaderLst[j]] = [randomizedHeaderLst[j], randomizedHeaderLst[i]];
    }
    const textLst = [];
    for (let index = 0; index < randomizedHeaderLst.length; index++) {
      if (index % 2 === 0) {
        textLst.push(<h1 className="hollow_slider_text" key={index} id={index}>{randomizedHeaderLst[index] + "."}</h1>);
      } else {
        textLst.push(<h1 className="solid_slider_text" key={index} id={index}>{randomizedHeaderLst[index] + "."}</h1>);
      }
    }
    return textLst;
  };

  const [headers_list1] = useState(() => giveRandomizedHeaderLst());
  const [headers_list2] = useState(() => giveRandomizedHeaderLst());
  const [headers_list3] = useState(() => giveRandomizedHeaderLst());

  // Row 1: Leftward (a=2)
  const row1 = useInfiniteScroll(1);
  // Row 2: Rightward (a=-2)
  const row2 = useInfiniteScroll(-1);
  // Row 3: Leftward (a=2)
  const row3 = useInfiniteScroll(1);

  return (
    <div className="slider_section" id="sliderContent">
      <div
        ref={row1.ref}
        className="scroll_content scroll_content_left"
        onMouseEnter={row1.onMouseEnter}
        onMouseLeave={row1.onMouseLeave}
        onTouchStart={row1.onTouchStart}
        onTouchEnd={row1.onTouchEnd}
        tabIndex={0}
        role="region"
        aria-label="Technoriti Topics Ticker Row 1"
      >
        <div className="ticker_track ticker_track_left">
          {headers_list1}
          {headers_list1}
        </div>
      </div>
      <div
        ref={row2.ref}
        className="scroll_content scroll_content_right"
        onMouseEnter={row2.onMouseEnter}
        onMouseLeave={row2.onMouseLeave}
        onTouchStart={row2.onTouchStart}
        onTouchEnd={row2.onTouchEnd}
        tabIndex={0}
        role="region"
        aria-label="Technoriti Topics Ticker Row 2"
      >
        <div className="ticker_track ticker_track_right">
          {headers_list2}
          {headers_list2}
        </div>
      </div>
      <div
        ref={row3.ref}
        className="scroll_content scroll_content_left"
        onMouseEnter={row3.onMouseEnter}
        onMouseLeave={row3.onMouseLeave}
        onTouchStart={row3.onTouchStart}
        onTouchEnd={row3.onTouchEnd}
        tabIndex={0}
        role="region"
        aria-label="Technoriti Topics Ticker Row 3"
      >
        <div className="ticker_track ticker_track_left">
          {headers_list3}
          {headers_list3}
        </div>
      </div>
    </div>
  );
};

export default Slider_section;
