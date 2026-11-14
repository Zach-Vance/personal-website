import { normalize, retrieve, sourceFor } from "./knowledge.mjs";

// Only recent questions travel with a request. Generated answers are never evidence.
export const MAX_HISTORY = 4;
const sources = (...ids) => ids.map(sourceFor);
const topics = [
  ["setwise", /\bsetwise\b/],
  ["mesonet", /\bmesonet\b/],
  ["super sod", /\bsuper sod\b/],
];

function resolveQuestion(question, history) {
  const current = normalize(question);
  if (topics.some(([, pattern]) => pattern.test(current))) return current;
  const refersBack = /\b(it|its|that project|that app|that application|those dashboards|that work)\b/.test(current);
  const asksMore = /^(?:(?:and|ok|okay)[,\s]+)?(?:tell me more|more details|go on|what else|why|how so)[?.!\s]*$/.test(current);
  if ((!refersBack && !asksMore) || !history.length) return current;
  const previous = resolveQuestion(history.at(-1), history.slice(0, -1));
  const topic = topics.find(([, pattern]) => pattern.test(previous));
  if (topic) return `${current} ${topic[0]}${asksMore ? ` ${previous}` : ""}`;
  return asksMore ? previous : current;
}

// Shared by the browser fallback and server so both understand the same question.
export function portfolioAnswer(question, history = []) {
  const query = resolveQuestion(question, history.slice(-MAX_HISTORY));
  const result = (docs, text, kind = "evidence") => ({ query, docs, text, kind });
  const is = (pattern) => pattern.test(query);
  if (is(/\bhow old\b|\b(age|birthday|birthdate|born)\b/) && !is(/\bsetwise|mesonet|super sod\b/))
    return result([], "Zach’s age and date of birth aren’t published in this portfolio. His education and work timeline are available if that’s what you’re looking for.", "limitation");
  if (is(/\bwhere\b.*\bfrom\b|\bhometown\b|\bbirthplace\b/))
    return result(sources("overview"), "Zach is based in Charleston, South Carolina [1]. The portfolio doesn’t specify his hometown or birthplace.", "limitation");
  if (is(/\b(years?|long|much)\b.*\b(experience|working|worked|developer|developing|coding)\b|\bexperience\b.*\b(years?|long)\b/))
    return result(sources("applications", "mesonet"), "Zach has worked at Super-Sod since July 2024, building operational applications, and previously interned as an Application Developer at Kentucky Mesonet from September 2022 to May 2024 [1][2]. His published development experience dates back to 2022; the internship is part of that timeline, rather than all of it being full-time experience.");
  if (is(/\bhire\b|\bhiring\b|\b(?:good|right|strong) (?:fit|candidate)\b/))
    return result(sources("backend", "integration", "applications"), "Zach’s portfolio gives you concrete work to evaluate for a backend, integrations, or full-stack role: Go REST APIs and PostgreSQL data integrity [1], Shopify/ERP and HubSpot integrations [2], and SvelteKit/TypeScript operational applications [3]. That makes a conversation about those roles worthwhile; a hiring decision still depends on your requirements and an interview.");

  const explicitTopic = topics.find(([, pattern]) => pattern.test(query));
  if (is(/\bfrontend\b|\breact\b/) && !explicitTopic) {
    if (is(/\breact\b/) && !is(/\bfrontend\b/))
      return result(sources("mesonet", "setwise"), "Zach used React, Next.js, and TypeScript to develop weather-data quality dashboards at Kentucky Mesonet [1]. He also uses that stack in Setwise, his strength-training application in active development [2].");
    return result(sources("applications", "mesonet", "setwise"), "His frontend work includes SvelteKit and TypeScript operational applications at Super-Sod for ordering, inventory, pricing, dispatch, and purchasing [1], plus React/Next.js weather-data dashboards at Kentucky Mesonet [2]. His personal strength-training app, Setwise, also uses React, Next.js, and TypeScript and is in active development [3].");
  }
  if (is(/^(?:what is|what.s|tell me about|describe)\s+setwise[?.!\s]*$/))
    return result(sources("setwise"), "Setwise is Zach’s personal strength-training application, currently in active development. It combines workout logging, history-based training recommendations, and work on offline logging and synchronization, using Next.js, React, TypeScript, Prisma, PostgreSQL, and Supabase [1].");
  if (is(/^(?:hi|hello|hey|thanks|thank you)[!.\s]*$/))
    return result([], "Ask me about Zach’s projects, React or backend experience, or the kind of role his work could fit. You can ask follow-up questions, too.", "conversation");

  // Explicit project names narrow follow-ups such as “does it use React?”;
  // they should not bring in a different project's matching technology.
  let docs = retrieve(query, explicitTopic ? 12 : 3);
  if (explicitTopic) {
    const topicDocs = {
      setwise: ["setwise", "offline", "recommendations", "verification"],
      mesonet: ["mesonet"],
      "super sod": ["applications", "integration", "backend", "delivery"],
    }[explicitTopic[0]];
    const scopedQuery = query.replace(explicitTopic[1], "");
    const relevant = retrieve(scopedQuery, 12).filter((doc) => topicDocs.includes(doc.id));
    docs = (relevant.length ? relevant : docs.filter((doc) => topicDocs.includes(doc.id))).slice(0, 3);
    // A project name alone isn't evidence for an unsupported property.
    if (is(/\b(salary|age|hometown|birthplace|married|wife|husband|revenue|customers)\b/)) docs = [];
  }
  if (!docs.length)
    return result([], "I don’t have published evidence for that detail. I can help with Zach’s work history, frontend or backend experience, projects, and engineering approach. For anything else, contact Zach through the portfolio.", "limitation");
  return result(docs, docs.map((doc, i) => `${doc.text} [${i + 1}]`).join("\n\n"));
}
