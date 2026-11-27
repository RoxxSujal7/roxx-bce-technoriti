import React, { useId, useState } from "react";
import { cn } from "../lib/utils";
import "./CinematicList.scss";

/**
 * @typedef {Object} CinematicItemProps
 * @property {string} id - Stable sequence number (e.g. "01")
 * @property {string} title - Competition name or question
 * @property {string} [location] - Category, track or tag
 * @property {string} [src] - Background image URL
 * @property {string} [alt] - Image description
 * @property {string} [prize] - Prize pool summary
 * @property {string} [venue] - Venue details
 * @property {string} [teamSize] - Team specification
 * @property {React.ReactNode} [answer] - Answer content for FAQ mode
 * @property {"event" | "faq"} [variant] - Mode variant
 * @property {boolean} [isExpanded] - Whether row is actively expanded
 * @property {() => void} [onClick] - Click handler
 */

/**
 * CinematicListItem - Individual expandable row
 * @param {CinematicItemProps} props
 */
export function CinematicListItem({
  id,
  title,
  location,
  src,
  alt,
  prize,
  venue,
  teamSize,
  answer,
  variant = "event",
  isExpanded = false,
  onClick,
}) {
  const isFaq = variant === "faq" || Boolean(answer);
  const panelId = useId();

  return (
    <div
      className={cn(
        "cinematic-list-item group",
        isFaq && "variant-faq",
        isExpanded && "is-expanded"
      )}
    >
      {/* Background Image Layer (only when src is present) */}
      {src && (
        <div className="cinematic-bg-layer" aria-hidden="true">
          <img
            src={src}
            alt=""
            loading="lazy"
            decoding="async"
            className="cinematic-bg-img"
          />
          <div className="cinematic-bg-gradient" />
        </div>
      )}

      {/* Semantic Interactive Row Trigger */}
      <button
        type="button"
        onClick={onClick}
        aria-expanded={isExpanded}
        aria-controls={isFaq && answer ? panelId : undefined}
        className="cinematic-row-trigger"
      >
        <span className="cinematic-content">
          <span className="cinematic-left">
            <span className="cinematic-item-num">{id}</span>
            <span className="cinematic-text-col">
              <span className="cinematic-item-title">{title}</span>
              {location && <span className="cinematic-mobile-location">{location}</span>}
            </span>
          </span>

          <span className="cinematic-right">
            {location && <span className="cinematic-desktop-location">{location}</span>}
            <span className="cinematic-arrow-btn" aria-hidden="true">
              <svg
                className="cinematic-arrow-icon"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14" />
                <path d="m12 5 7 7-7 7" />
              </svg>
            </span>
          </span>
        </span>
      </button>

      {/* Expanded Meta Footer (Event Mode) */}
      {!isFaq && (prize || venue || teamSize) && (
        <div className="cinematic-expanded-footer">
          <div className="cinematic-meta-pills">
            {prize && <span className="cinematic-pill">{prize}</span>}
            {venue && <span className="cinematic-pill">{venue}</span>}
            {teamSize && <span className="cinematic-pill">{teamSize}</span>}
          </div>
          <span className="cinematic-action-hint">
            Select row to view full rules &amp; registration ➔
          </span>
        </div>
      )}

      {/* Expanded Answer Body (FAQ Mode) */}
      {isFaq && answer && (
        <div
          id={panelId}
          hidden={!isExpanded}
          className="cinematic-faq-answer-wrapper"
        >
          <div className="cinematic-faq-answer-content">
            {answer}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * CinematicList - Container for competition or FAQ rows
 * @param {{
 *   items: CinematicItemProps[],
 *   onItemSelect?: (item: CinematicItemProps) => void,
 *   selectedId?: string,
 *   variant?: "event" | "faq",
 *   className?: string
 * }} props
 */
export function CinematicList({
  items = [],
  onItemSelect,
  selectedId,
  variant = "event",
  className,
}) {
  const [expandedId, setExpandedId] = useState(null);

  const handleRowClick = (item) => {
    setExpandedId((prev) => (prev === item.id ? null : item.id));
    onItemSelect?.(item);
  };

  if (!items || items.length === 0) return null;

  return (
    <div className={cn("cinematic-list-container py-4", variant === "faq" && "cinematic-faq-container", className)}>
      <div className="cinematic-list-wrapper">
        {items.map((item) => (
          <CinematicListItem
            key={item.id}
            {...item}
            variant={variant}
            isExpanded={expandedId === item.id || selectedId === item.rawId}
            onClick={() => handleRowClick(item)}
          />
        ))}
        <div className="cinematic-row-divider" />
      </div>
    </div>
  );
}

export default CinematicList;
