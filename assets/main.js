import { config } from "./config.js";
import { evidence, sourceFor } from "./knowledge.mjs";
import {
  portfolioAnswer,
  MAX_HISTORY,
  API_CONTRACT_VERSION,
} from "./conversation.mjs";
import { readEvents } from "./stream.mjs";
import { hasValidCitations } from "./answer.mjs";

document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});
document
  .querySelector("[data-print]")
  ?.addEventListener("click", () => window.print());

const form = document.querySelector("#ask-form");
if (form) {
  const input = document.querySelector("#question");
  const log = document.querySelector("#conversation");
  const submit = document.querySelector("#ask-submit");
  const stop = document.querySelector("#ask-stop");
  const status = document.querySelector("#ask-status");
  const mode = document.querySelector("#ask-mode");
  const note = document.querySelector("#ask-note");
  const clear = document.querySelector("#ask-clear");
  const suggestions = document.querySelectorAll("[data-question]");
  let active = null;
  let timedOut = false;
  let history = [];
  const endpoint = config.askEndpoint;
  if (endpoint) {
    mode.textContent = "AI + sources";
    note.textContent =
      "AI answers use published portfolio evidence. Your question and up to four recent questions are sent to the AI service for follow-ups. Questions and answers may be logged for up to three months to improve this assistant. Please leave out personal information.";
  }

  function sourceLinks(container, docs, answerText = null) {
    container.replaceChildren();
    docs.forEach((doc, index) => {
      if (answerText && !answerText.includes(`[${index + 1}]`)) return;
      const a = document.createElement("a");
      a.href = doc.url;
      a.textContent = `${index + 1}. ${doc.title} ↗`;
      container.append(a);
    });
  }

  function renderCitations(container, text, docs) {
    container.replaceChildren();
    let last = 0;
    for (const match of text.matchAll(/\[(\d+)\]/g)) {
      container.append(document.createTextNode(text.slice(last, match.index)));
      const source = docs[Number(match[1]) - 1];
      if (source) {
        const a = document.createElement("a");
        a.href = source.url;
        a.textContent = match[0];
        a.title = source.title;
        a.style.textDecoration = "underline";
        container.append(a);
      } else container.append(document.createTextNode(match[0]));
      last = match.index + match[0].length;
    }
    container.append(document.createTextNode(text.slice(last)));
  }

  function showEvidence(question, label, answer, sources) {
    const plan = portfolioAnswer(question, history);
    const { text } = plan;
    const docs = plan.kind === "discovery" ? [] : plan.docs;
    label.textContent = "FROM THE PORTFOLIO · EVIDENCE SEARCH";
    renderCitations(answer, text, docs);
    sourceLinks(sources, docs);
    return answer.textContent;
  }

  async function ask(question) {
    question = question.trim();
    if (!question || active) return;
    if (question.length > 600) {
      status.textContent = "Please keep the question under 600 characters.";
      return;
    }
    const controller = new AbortController();
    timedOut = false;
    const timer = endpoint
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, 30000)
      : null;
    active = controller;
    submit.disabled = true;
    input.disabled = true;
    clear.disabled = true;
    clear.hidden = false;
    suggestions.forEach((button) => {
      button.disabled = true;
    });
    stop.hidden = !endpoint;
    log.setAttribute("aria-busy", "true");
    status.textContent = endpoint
      ? "Finding evidence and preparing an answer."
      : "Searching the portfolio.";

    const turn = document.createElement("article");
    turn.className = "chat-turn";
    const q = document.createElement("p");
    q.className = "chat-question";
    q.textContent = question;
    const label = document.createElement("span");
    label.className = "chat-label";
    label.textContent = "FINDING RELEVANT WORK…";
    const answer = document.createElement("p");
    answer.className = "chat-answer";
    const sources = document.createElement("div");
    sources.className = "answer-sources";
    sources.setAttribute("aria-label", "Supporting portfolio evidence");
    turn.append(q, label, answer, sources);
    log.append(turn);
    while (log.querySelectorAll(".chat-turn").length > 8)
      log.querySelector(".chat-turn").remove();
    log.scrollTop = log.scrollHeight;
    let result = "";
    try {
      if (!endpoint) result = showEvidence(question, label, answer, sources);
      else {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question, history }),
          signal: controller.signal,
        });
        if (
          !response.ok ||
          response.headers.get("X-Portfolio-API-Version") !==
            API_CONTRACT_VERSION ||
          !response.body ||
          !response.headers.get("content-type")?.includes("text/event-stream")
        )
          throw new Error("AI service unavailable");
        let completed = false;
        let docs = [];
        for await (const event of readEvents(response.body)) {
          if (event.type === "sources") {
            docs = (event.ids || [])
              .map(sourceFor)
              .filter(Boolean)
              .slice(0, evidence.length);
            if (docs.length <= 3) sourceLinks(sources, docs);
          } else if (event.type === "delta") {
            if (typeof event.text !== "string")
              throw new Error("Invalid stream");
            result += event.text;
            if (result.length > 16000) throw new Error("Answer too long");
            answer.textContent = result;
          } else if (event.type === "answer") {
            result = event.text;
            answer.textContent = result;
          } else if (event.type === "error")
            throw new Error("Generation interrupted");
          else if (event.type === "done") completed = true;
          log.scrollTop = log.scrollHeight;
        }
        if (!completed || !result.trim()) throw new Error("Answer interrupted");
        if (docs.length && !hasValidCitations(result, docs.length))
          throw new Error("Answer has invalid citations");
        label.textContent = docs.length
          ? "ANSWER · PORTFOLIO SOURCES"
          : "ABOUT THIS QUESTION";
        renderCitations(answer, result, docs);
        sourceLinks(sources, docs, result);
      }
      status.textContent = `Answer ready. ${result}`;
    } catch (error) {
      if (controller.signal.aborted && !timedOut) {
        result = "";
        label.textContent = "STOPPED";
        answer.textContent = "Answer stopped. You can ask another question.";
        sources.replaceChildren();
        status.textContent = "Answer stopped.";
      } else {
        result = showEvidence(question, label, answer, sources);
        label.textContent = timedOut
          ? "AI TIMED OUT · SHOWING PORTFOLIO EVIDENCE"
          : "AI UNAVAILABLE · SHOWING PORTFOLIO EVIDENCE";
        status.textContent = `The AI service is unavailable. Showing published evidence instead. ${result}`;
      }
    } finally {
      // Stopped answers don't become context. Completed fallback answers do.
      if (result) history = [...history, question].slice(-MAX_HISTORY);
      active = null;
      clearTimeout(timer);
      log.removeAttribute("aria-busy");
      submit.disabled = false;
      input.disabled = false;
      clear.disabled = false;
      suggestions.forEach((button) => {
        button.disabled = false;
      });
      stop.hidden = true;
      input.value = "";
      log.scrollTop = log.scrollHeight;
      input.focus({ preventScroll: true });
    }
  }
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    ask(input.value);
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  document
    .querySelectorAll("[data-question]")
    .forEach((button) =>
      button.addEventListener("click", () => ask(button.dataset.question)),
    );
  stop.addEventListener("click", () => active?.abort());
  clear.addEventListener("click", () => {
    if (active) return;
    log.querySelectorAll(".chat-turn").forEach((turn) => turn.remove());
    history = [];
    clear.hidden = true;
    status.textContent = "Conversation cleared. Ask a new question.";
    input.value = "";
    input.focus({ preventScroll: true });
  });
}
