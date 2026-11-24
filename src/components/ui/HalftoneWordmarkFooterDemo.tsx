"use client"

import React from "react"
import HalftoneWordmarkFooter from "./halftone-wordmark-footer"

export default function HalftoneWordmarkFooterDemo() {
  return (
    <div className="w-full">
      <HalftoneWordmarkFooter
        wordmark="technoriti '26"
        label="TECHNORITI '26"
        meta="BCE BHAGALPUR · INDIA · 2026"
        palette={{ background: "#000000", ink: "#F0EBF3", warm: "#BE00D7" }}
      />
    </div>
  )
}
