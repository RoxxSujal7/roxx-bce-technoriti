import * as React from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { cn } from "../../lib/utils";
import "./ButtonWithIcon.scss";

export interface ButtonWithIconProps {
  children: React.ReactNode;
  to?: string;
  href?: string;
  onClick?: (e: React.MouseEvent) => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  "aria-label"?: string;
  className?: string;
  target?: string;
  rel?: string;
  id?: string;
}

export const ButtonWithIcon = React.forwardRef<
  any,
  ButtonWithIconProps
>(({
  children,
  to,
  href,
  onClick,
  type = "button",
  disabled = false,
  "aria-label": ariaLabel,
  className,
  target,
  rel,
  id,
  ...props
}, ref) => {
  const content = (
    <>
      <span className="button-with-icon-text">
        {children}
      </span>
      <div
        className="button-with-icon-circle"
        aria-hidden="true"
      >
        <ArrowUpRight size={16} />
      </div>
    </>
  );

  const combinedClass = cn(
    "button-with-icon group",
    disabled && "disabled",
    className
  );

  if (to) {
    return (
      <Link
        to={to}
        ref={ref}
        id={id}
        className={combinedClass}
        aria-label={ariaLabel}
        aria-disabled={disabled}
        onClick={disabled ? (e) => e.preventDefault() : onClick}
        {...props}
      >
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={href}
        ref={ref}
        id={id}
        className={combinedClass}
        aria-label={ariaLabel}
        aria-disabled={disabled}
        target={target}
        rel={rel || (target === "_blank" ? "noopener noreferrer" : undefined)}
        onClick={disabled ? (e) => e.preventDefault() : onClick}
        {...props}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type={type}
      ref={ref}
      id={id}
      className={combinedClass}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      {...props}
    >
      {content}
    </button>
  );
});

ButtonWithIcon.displayName = "ButtonWithIcon";

export default ButtonWithIcon;
