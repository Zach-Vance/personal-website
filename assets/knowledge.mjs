// Approved public portfolio facts. Shared by static search and the AI backend.
// Never put private résumé notes, employer source, or credentials in this file.
export const evidence = [
  {
    id: "overview",
    title: "About Zach",
    url: "index.html#about",
    keywords:
      "zach vance background overview software developer engineer charleston location about",
    text: "Zach Vance is a software developer based in Charleston, South Carolina. He builds backend APIs, data-intensive applications, integrations, and practical automation. His approach emphasizes finding underlying problems and building reliable, maintainable systems that can grow with the business.",
  },
  {
    id: "applications",
    title: "Super-Sod · Application development",
    url: "index.html#experience",
    keywords:
      "work job current professional experience career employment super sod frontend full stack sveltekit typescript javascript erp application operations",
    text: "Since July 2024, Zach has worked at Super-Sod as a Junior Python Developer. He builds and maintains operational applications for ordering, invoicing, inventory, pricing, dispatch, and purchasing with SvelteKit, TypeScript, and PostgreSQL.",
  },
  {
    id: "integration",
    title: "Connecting commerce and operations",
    url: "projects/integrations.html",
    keywords:
      "Zach builds reliable business integrations and automation, improves data quality, and develops tools for nontechnical teams.",
    text: "Zach builds reliable business integrations and automation, improves data quality, and develops tools for nontechnical teams.",
  },
  {
    id: "backend",
    title: "Backend APIs & data integrity",
    url: "projects/integrations.html#backend",
    keywords:
      "backend go golang rest api database postgres postgresql sql plpgsql integrity triggers functions views data architecture",
    text: "Zach develops Go REST APIs and PostgreSQL functions, triggers, views, and integrity rules supporting operational and analytical data flows. His work connects application behavior, relational data, external APIs, and business requirements.",
  },
  {
    id: "delivery",
    title: "Background processing & delivery",
    url: "projects/integrations.html#delivery",
    keywords:
      "python flask celery rabbitmq docker azure cloud deployment devops ci cd github actions queues async background testing release",
    text: "Zach implements background-processing components with Python/Flask, Celery, RabbitMQ, and Docker, and supports Azure deployments and GitHub Actions workflows. He works with teammates to extend existing services, troubleshoot production behavior, and maintain delivery workflows.",
  },
  {
    id: "setwise",
    title: "Setwise · Strength-training application",
    url: "projects/setwise.html",
    keywords:
      "setwise strength fitness training personal project next react nextjs typescript prisma supabase postgres full stack app application",
    text: "Setwise is Zach’s personal strength-training application, under active development in 2026. It uses Next.js, React, TypeScript, Prisma, PostgreSQL, and Supabase. The work includes backend services, relational data modeling, durable offline workout logging and synchronization, history-based recommendations, and database migration validation.",
  },
  {
    id: "offline",
    title: "Setwise · Built for interrupted connections",
    url: "projects/setwise.html#offline",
    keywords:
      "offline sync synchronization durable reliability retries connection connectivity workout logging setwise browser storage",
    text: "Setwise is designed to keep workout logging durable through connectivity interruptions and synchronize changes when connectivity returns. Offline reliability and retry behavior are important design concerns. This is an active personal project; the portfolio does not claim that every device or acceptance check is complete.",
  },
  {
    id: "recommendations",
    title: "Setwise · History-based recommendations",
    url: "projects/setwise.html#recommendations",
    keywords:
      "recommendations prediction algorithm logic history load reps rir volume setwise training ai model",
    text: "Setwise uses workout history and deterministic domain logic to suggest loads, repetitions, and reps in reserve, with conservative, user-overridable volume adjustments. These recommendations are not described as generative AI. AI coding tools support development, which is separate from the application’s recommendation logic.",
  },
  {
    id: "verification",
    title: "Setwise · Verification & database boundaries",
    url: "projects/setwise.html#verification",
    keywords:
      "security authorization rls row level database migrations tests testing ci cd github actions quality verification prisma setwise",
    text: "Setwise uses reviewed SQL migrations, row-level security, explicit server-side authorization, automated tests, and CI checks that validate migrations against disposable PostgreSQL databases. Server authorization matters because a privileged database connection can bypass row-level security. The public GitHub repository provides the implementation and current development status.",
  },
  {
    id: "mesonet",
    title: "Kentucky Mesonet · Weather & machine learning",
    url: "projects/mesonet.html",
    keywords:
      "mesonet weather dashboard visualization frontend nextjs react typescript python tensorflow machine learning ml image recognition model train trained internship intern",
    text: "As an Application Developer Intern at Kentucky Mesonet from September 2022 to May 2024, Zach developed weather-data quality dashboards with Next.js, React, and TypeScript, wrote Python scripts for processing and analyzing observations, and developed and trained a Python/TensorFlow image-recognition model.",
  },
  {
    id: "education",
    title: "Education & technical toolkit",
    url: "resume.html#education",
    keywords:
      "education degree university wku western kentucky graduate graduation skills tools technologies stack languages",
    text: "Zach earned a B.S. in Computer Science from Western Kentucky University in 2024, with a Systems and Scientific Concentration and a 3.7 GPA. His toolkit includes Python, Go, TypeScript/JavaScript, SQL, PostgreSQL, SvelteKit, React, Next.js, Docker, Azure, and GitHub Actions.",
  },
  {
    id: "approach",
    title: "Engineering approach & AI tools",
    url: "index.html#about",
    keywords:
      "approach philosophy maintainable scalability scalable architecture ai tools claude codex agentic development engineering review",
    text: "Zach uses Claude Code in his professional development workflow and Codex on personal projects. He retains responsibility for requirements, technical decisions, review, testing, and what ships. His engineering focus is solving underlying problems and creating maintainable systems rather than treating generated code as automatically correct.",
  },
];

const stopwords = new Set(
  "a an the is are was were be been what which who how does do did can could would should tell me about of to in on for with and or his he her it its i you your zach vance please have has work works experience".split(
    " ",
  ),
);
export const normalize = (value) =>
  value
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/next\.js/g, "nextjs")
    .replace(/super-sod/g, "super sod")
    .replace(/\bfront[\s-]+end\b/g, "frontend")
    .replace(/\bback[\s-]+end\b/g, "backend")
    .replace(/\b(?:user interfaces?|ui|client[\s-]+side)\b/g, "frontend")
    .replace(/\bfull[\s-]+stack\b/g, "full stack")
    .replace(/\brecat\b/g, "react")
    .replace(/\bhite\b/g, "hire");
export function tokenize(value) {
  return [...new Set(normalize(value).match(/[a-z0-9]+/g) || [])].filter(
    (word) => !stopwords.has(word) && word.length > 1,
  );
}

// Allow one missed, extra, substituted, or transposed letter in longer terms.
// Short words stay exact to avoid turning unrelated questions into matches.
function nearTerm(a, b) {
  if (a === b) return true;
  if (Math.min(a.length, b.length) < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (a[i] === b[i] && i < Math.min(a.length, b.length)) i++;
  if (a.length === b.length)
    return a.slice(i + 1) === b.slice(i + 1) ||
      (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  return a.length > b.length
    ? a.slice(i + 1) === b.slice(i)
    : a.slice(i) === b.slice(i + 1);
}

export function retrieve(question, limit = 3) {
  if (
    /^(?:who (?:is|are)|tell me about)\s+(?:zach(?: vance)?|you)[?.!\s]*$/i.test(
      question.trim(),
    )
  )
    return [evidence[0]];
  if (
    /^(?:what (?:has|have|does) (?:zach|he|you) (?:built|build|made)|what are (?:his|your|zach.s) projects)[?.!\s]*$/i.test(
      question.trim(),
    )
  )
    return [evidence[5], evidence[2], evidence[9]].slice(0, limit);
  const query = tokenize(question);
  if (!query.length) return [];
  return evidence
    .map((doc) => {
      const title = tokenize(doc.title);
      const keys = tokenize(doc.keywords);
      const body = tokenize(doc.text);
      const weights = query.map((term) =>
        (title.some((word) => nearTerm(term, word)) ? 5 : 0) +
        (keys.some((word) => nearTerm(term, word)) ? 3 : 0) +
        (body.some((word) => nearTerm(term, word)) ? 1 : 0),
      );
      const score = weights.reduce((sum, weight) => sum + weight, 0);
      return { ...doc, score, coverage: weights.filter(Boolean).length / query.length };
    })
    .filter((doc) => doc.score >= 3)
    .sort((a, b) => b.score - a.score || b.coverage - a.coverage)
    .slice(0, limit);
}

export function sourceFor(id) {
  return evidence.find((doc) => doc.id === id);
}
