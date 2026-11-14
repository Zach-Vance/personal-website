// Synthetic questions only. Never copy visitor logs into the published fixture set.
export const asOf = "2026-11-14T12:00:00Z";
export const cases = [
  {
    id: "ai-workflows",
    question: "How does Zach integrate AI into systems?",
    sources: ["ai-reconciliation", "portfolio-agent"],
    includes: ["human review", "conversational AI assistant"],
    excludes: ["Claude", "Codex"],
  },
  {
    id: "backend",
    question: "What backend APIs has Zach developed?",
    sources: ["backend"],
    includes: ["Go REST APIs", "PostgreSQL"],
  },
  {
    id: "offline",
    question: "How does Setwise handle offline logging?",
    sources: ["offline"],
    includes: ["active development", "designed"],
    excludes: ["guaranteed", "exactly once"],
  },
  {
    id: "recommendations",
    question: "Does Setwise use AI for recommendations?",
    sources: ["recommendations"],
    includes: ["deterministic", "active development"],
  },
  {
    id: "react",
    question: "What React work has he done?",
    sources: ["mesonet", "setwise"],
    includes: ["dashboards", "active development"],
  },
  {
    id: "hire",
    question: "Should I hire Zach?",
    sources: ["backend", "integration", "applications"],
    includes: ["Yes—Zach makes a strong case", "reduces manual corrections"],
  },
  {
    id: "tenure",
    question: "How many years experience does he have?",
    sources: ["applications", "mesonet"],
    includes: ["about 4 years", "including his internship"],
  },
  {
    id: "follow-up",
    question: "How does it handle failures?",
    history: ["Tell me about the website chatbot"],
    sources: ["portfolio-reliability"],
    includes: ["fall back", "citation"],
  },
  {
    id: "scope",
    question: "Implement binary search tree",
    sources: [],
    includes: ["outside that scope"],
    kind: "limitation",
  },
  {
    id: "personal",
    question: "What is his salary?",
    sources: [],
    includes: ["don’t have published evidence"],
    kind: "limitation",
  },
  {
    id: "backend-typo",
    question: "What is his abckend approach?",
    sources: ["backend"],
    includes: ["Go REST APIs"],
  },
  {
    id: "topic-switch",
    question: "Tell me about Mesonet",
    history: ["What is Setwise?"],
    sources: ["mesonet"],
    includes: ["Kentucky Mesonet"],
    excludes: ["workout"],
  },
];
