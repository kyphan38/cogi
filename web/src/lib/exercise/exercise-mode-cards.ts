import { ChevronRight } from "lucide-react";

export const ALL_EXERCISE_CARDS: {
  type: string;
  href: string;
  label: string;
  title: string;
  desc?: string;
  trailingIcon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  className?: string;
}[] = [
  {
    type: "analytical",
    href: "/exercise/analytical",
    label: "Analytical",
    title: "Spot flawed reasoning",
    desc: "Find embedded issues and decoys in a short passage.",
  },
  {
    type: "sequential",
    href: "/exercise/sequential",
    label: "Sequential",
    title: "Order a messy process",
    desc: "Drag steps into a defensible sequence with traps.",
  },
  {
    type: "systems",
    href: "/exercise/systems",
    label: "Systems",
    title: "Map feedback loops",
    desc: "Draw nodes and edges, then trace a shock ripple.",
  },
  {
    type: "evaluative",
    href: "/exercise/evaluative",
    label: "Evaluative",
    title: "Compare options fairly",
    desc: "Matrix or weighted scoring against hidden tradeoffs.",
  },
  {
    type: "generative",
    href: "/exercise/generative",
    label: "Generative",
    title: "Write, then stress-test your thinking",
    desc: "Scaffolded prompts, short debate with the model, and a rubric snapshot.",
  },
  {
    type: "combo",
    href: "/exercise/combo",
    label: "Combo",
    title: "Multi-step scenario chain",
    trailingIcon: ChevronRight,
    className: "sm:col-span-2",
  },
];

export const TYPE_LABEL: Record<string, string> = {
  analytical: "Analytical",
  sequential: "Sequential",
  systems: "Systems",
  evaluative: "Evaluative",
  generative: "Generative",
  combo: "Combo",
};
