import React from 'react';
import { AuthUI } from "../components/ui/auth-fuse";
import { Link } from "react-router-dom";

const DemoOne = () => {
  return (
    <div className="relative min-h-screen w-full bg-black text-white overflow-hidden">
      {/* Return to Home Brand Link */}
      <Link
        to="/"
        className="absolute top-6 left-6 z-50 flex items-center gap-2 text-white/70 hover:text-white transition-colors"
        style={{ textDecoration: "none", fontSize: "0.85rem", fontWeight: 700, letterSpacing: "1px" }}
      >
        <span style={{ fontSize: "1.1rem" }}>←</span>
        <span>TECHNORITI '26</span>
      </Link>
      <AuthUI />
    </div>
  );
};

export default DemoOne;
export { DemoOne, DemoOne as Auth };
