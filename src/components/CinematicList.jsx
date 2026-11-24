import React, { useState } from "react";
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

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      aria-expanded={isExpanded}
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
            alt={alt || title}
            loading="lazy"
            className="cinematic-bg-img"
          />
          <div className="cinematic-bg-gradient" />
        </div>
      )}

      {/* Main Row Content */}
      <div className="cinematic-content">
        <div className="cinematic-left">
          <span className="cinematic-item-num">{id}</span>
          <div className="cinematic-text-col">
            <h2 className="cinematic-item-title">{title}</h2>
            {location && <span className="cinematic-mobile-location">{location}</span>}
          </div>
        </div>

        <div className="cinematic-right">
          {location && <span className="cinematic-desktop-location">{location}</span>}
          <div className="cinematic-arrow-btn" aria-hidden="true">
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
          </div>
        </div>
      </div>

      {/* Expanded Meta Footer (Event Mode) */}
      {!isFaq && (prize || venue || teamSize) && (
        <div className="cinematic-expanded-footer">
          <div className="cinematic-meta-pills">
            {prize && <span className="cinematic-pill">{prize}</span>}
            {venue && <span className="cinematic-pill">{venue}</span>}
            {teamSize && <span className="cinematic-pill">{teamSize}</span>}
          </div>
          <span className="cinematic-action-hint">
            Click to view full rules & registration ➔
          </span>
        </div>
      )}

      {/* Expanded Answer Body (FAQ Mode) */}
      {isFaq && answer && (
        <div className="cinematic-faq-answer-wrapper">
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
