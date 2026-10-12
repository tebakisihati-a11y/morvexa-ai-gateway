"use client";

import React from "react";
import { LandingPage } from "@/components/landing/LandingPage";

export default function HomePage() {
  return (
    <LandingPage
      onEnterDashboard={(tab) => {
        // Direct users smoothly to customer space
        window.location.href = "/customer";
      }}
    />
  );
}
