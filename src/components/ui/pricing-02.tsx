"use client";

import React from "react";
import { Link } from "react-router-dom";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./card";
import { Badge } from "./badge";
import { Button } from "./button";
import { Separator } from "./separator";
import { cn } from "../../lib/utils";
import { Check, Flame } from "lucide-react";
import { motion } from "motion/react";

export type PricingPlan = {
  plan_name: string;
  plan_descp: string;
  plan_price: number | string;
  plan_period?: string;
  plan_feature: string[];
  plan_recommended: boolean;
  cta_label?: string;
  cta_link?: string;
};

// Verified Technoriti Accommodation Tariffs (Phase 6)
export const TECHNORITI_ACCOMMODATION_PLANS: PricingPlan[] = [
  {
    plan_name: "Campus Lodging",
    plan_descp: "Campus accommodation for registered Technoriti delegates.",
    plan_price: 50,
    plan_period: "/ person / day",
    plan_feature: [
      "Secure campus hostel allotment",
      "Mattress, bed & individual locker access",
      "24/7 power backup & high-speed Wi-Fi",
      "Dedicated Boys & Girls hostel blocks",
      "Round-the-clock CCTV security & faculty warden flow",
    ],
    plan_recommended: false,
    cta_label: "Book Lodging",
    cta_link: "/register",
  },
  {
    plan_name: "Mess & Dining",
    plan_descp: "Mess food arrangement for registered Technoriti delegates.",
    plan_price: 125,
    plan_period: "/ person / day",
    plan_feature: [
      "Breakfast: Hot breakfast & morning tea (7:30–9:30 AM)",
      "Lunch: Complete hygienic collegiate thali (12:30–2:30 PM)",
      "Dinner: Wholesome dinner with dessert (8:00–10:30 PM)",
      "100% Pure RO filtered drinking water",
      "Central college mess dining hall facilities",
    ],
    plan_recommended: false,
    cta_label: "Choose Meals",
    cta_link: "/register",
  },
  {
    plan_name: "Complete Stay",
    plan_descp: "Combined campus lodging and mess food arrangement.",
    plan_price: 175,
    plan_period: "/ person / day",
    plan_feature: [
      "Full campus hostel room stay (₹50 value)",
      "All 3 daily meals in college mess (₹125 value)",
      "24/7 Campus Wi-Fi & continuous electricity",
      "Flat ₹150 off for collegiate teams of >4 members",
      "Flat ₹250 off for contingents of 12+ members",
    ],
    plan_recommended: true,
    cta_label: "Book Complete Stay",
    cta_link: "/register",
  },
];

// Original 21st.dev SaaS Demo Data (Phase 3)
export const SAAS_DEMO_PLANS: PricingPlan[] = [
  {
    plan_name: "Pro",
    plan_descp:
      "Launch your website faster with ready-to-use components, blocks and zero setup friction with us.",
    plan_price: 2500,
    plan_period: "/month",
    plan_feature: [
      "Access to all core Shadcn UI blocks",
      "Copy-paste ready React code",
      "Regular library updates",
      "Commercial use license",
      "Community support & documentation",
    ],
    plan_recommended: false,
    cta_label: "Get started",
    cta_link: "/register",
  },
  {
    plan_name: "Pro Plus",
    plan_descp:
      "Scale with confidence using premium blocks, templates, and included strategy guidance.",
    plan_price: 3800,
    plan_period: "/month",
    plan_feature: [
      "Everything in Pro",
      "Premium templates & more sections",
      "Early access to new components",
      "Private Discord & priority support",
      "Monthly strategy & growth sessions",
    ],
    plan_recommended: true,
    cta_label: "Get started",
    cta_link: "/register",
  },
  {
    plan_name: "Enterprise",
    plan_descp:
      "Build at scale with full access, priority support, and dedicated one-on-one strategy calls.",
    plan_price: 5000,
    plan_period: "/month",
    plan_feature: [
      "Everything in Pro Plus",
      "Unlimited team seats",
      "Dedicated UI & integration support",
      "Custom component requests",
      "One-on-one implementation",
    ],
    plan_recommended: false,
    cta_label: "Get started",
    cta_link: "/register",
  },
];

export interface PricingProps {
  plans?: PricingPlan[];
  isDemo?: boolean;
  badgeText?: string;
  headingText?: string;
  descriptionText?: string;
  className?: string;
  id?: string;
}

const Pricing: React.FC<PricingProps> = ({
  plans,
  isDemo = false,
  badgeText = isDemo ? "Pricing" : "ACCOMMODATION",
  headingText = isDemo
    ? "Pick the plan that fits your start-up"
    : "Choose Your Stay",
  descriptionText = isDemo
    ? ""
    : "Simple and transparent campus accommodation pricing for Technoriti '26 delegates.",
  className,
  id = "pricing-section",
}) => {
  const activePlans = plans || (isDemo ? SAAS_DEMO_PLANS : TECHNORITI_ACCOMMODATION_PLANS);

  const pricingCardVariants = {
    hidden: {
      opacity: 0,
      x: -60,
    },
    visible: (index: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: index * 0.25,
        duration: 0.6,
        ease: "easeInOut",
      },
    }),
  };

  return (
    <section id={id} className={cn("bg-background py-10 lg:py-0 w-full", className)}>
      <div className="max-w-7xl mx-auto px-4 xl:px-16 lg:py-16 sm:py-12 py-8">
        <div className="flex flex-col gap-8 md:gap-12 items-center justify-center w-full">
          {/* Heading */}
          <div className="flex flex-col gap-3 justify-center items-center text-center">
            {/* Badge */}
            <Badge
              variant="outline"
              className="py-1 px-3 text-xs sm:text-sm font-semibold tracking-wider uppercase leading-5 w-fit h-7 border-purple-500/40 text-purple-400 bg-purple-950/20"
            >
              {badgeText}
            </Badge>

            {/* Heading */}
            <div className="max-w-xl mx-auto text-center">
              <h2 className="text-foreground text-3xl sm:text-5xl font-bold tracking-tight text-white">
                {headingText}
              </h2>
              {descriptionText && (
                <p className="text-white/60 text-sm sm:text-base mt-2 max-w-lg mx-auto">
                  {descriptionText}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:flex-row gap-6 items-stretch h-full w-full">
            {activePlans.map((plan: PricingPlan, index: number) => {
              const isFeatured = plan.plan_recommended;

              return (
                <motion.div
                  key={index}
                  variants={pricingCardVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  custom={index}
                  className={cn(
                    "relative flex-1 flex flex-col w-full",
                    isFeatured && "z-10 scale-102",
                  )}
                >
                  {/* GRADIENT BORDER */}
                  {isFeatured && (
                    <div className="absolute -inset-0.5 rounded-2xl overflow-hidden pointer-events-none">
                      {/* Animated conic-gradient border */}
                      <div
                        className={cn(
                          "absolute -inset-full blur-xs animate-spin-2s",
                          isDemo
                            ? "bg-conic from-blue-500 via-red-500 to-teal-400"
                            : ""
                        )}
                        style={{
                          background: isDemo
                            ? undefined
                            : "conic-gradient(from 0deg, #BE00D7, #ff2df0, #7b008b, #ff70f5, #BE00D7)",
                        }}
                      />

                      {/* Inner mask */}
                      <div
                        className="absolute inset-0.5 rounded-2xl bg-card"
                        style={{ backgroundColor: "#1d1c1c" }}
                      />
                    </div>
                  )}

                  {/* CARD */}
                  <Card
                    className={cn(
                      "relative flex-1 flex flex-col rounded-2xl p-8 gap-8 transition-colors",
                      isFeatured ? "border-0 ring-0 shadow-2xl shadow-purple-900/20" : "border border-white/10 hover:border-white/20",
                    )}
                    style={{ backgroundColor: "#1d1c1c" }}
                  >
                    <CardHeader className="p-0">
                      <div className="flex flex-col gap-3 self-stretch">
                        <div className="flex items-center justify-between gap-2">
                          <CardTitle
                            className="text-2xl font-bold tracking-tight"
                            style={{ color: isFeatured ? "#BE00D7" : "#ffffff" }}
                          >
                            {plan.plan_name}
                          </CardTitle>

                          {isFeatured && (
                            <Badge
                              className="py-1 px-3 text-xs font-bold uppercase tracking-wider leading-5 w-fit h-7 flex items-center gap-1.5 border-0 text-white"
                              style={{ backgroundColor: "#BE00D7" }}
                            >
                              <Flame size={15} /> RECOMMENDED
                            </Badge>
                          )}
                        </div>

                        <CardDescription className="text-sm sm:text-base font-normal max-w-2xl text-white/70">
                          {plan.plan_descp}
                        </CardDescription>
                      </div>
                    </CardHeader>

                    <CardContent className="flex flex-col flex-1 gap-8 p-0">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-foreground text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                          {typeof plan.plan_price === "number" && !isDemo
                            ? `₹${plan.plan_price}`
                            : isDemo
                            ? `$${plan.plan_price}`
                            : plan.plan_price}
                        </span>

                        <span className="text-muted-foreground text-sm sm:text-base font-normal text-white/60">
                          {plan.plan_period || "/ person / day"}
                        </span>
                      </div>

                      <Separator orientation="horizontal" className="bg-white/10" />

                      <ul className="flex flex-col gap-3.5 flex-1">
                        {plan.plan_feature.map((feature, idx) => (
                          <li
                            key={idx}
                            className="flex items-start gap-3 text-sm sm:text-base font-normal text-white/80 leading-relaxed"
                          >
                            <Check className="size-4 shrink-0 mt-1" style={{ color: "#BE00D7" }} />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        className={cn(
                          "w-full h-12 cursor-pointer font-semibold rounded-xl text-base transition-all",
                          isFeatured
                            ? "text-white shadow-lg shadow-purple-900/30 hover:opacity-95"
                            : "bg-white/5 border border-white/20 text-white hover:bg-white/10 hover:border-white/35"
                        )}
                        style={isFeatured ? { backgroundColor: "#BE00D7" } : undefined}
                        asChild
                      >
                        <Link to={plan.cta_link || "/register"}>
                          {plan.cta_label || "Get started"}
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export { Pricing, Pricing as PricingTable };
export default Pricing;
