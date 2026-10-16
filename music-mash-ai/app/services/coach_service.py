"""AI coach: measured metrics → diagnosis → retrieved exercises → (optional) LLM → validated JSON.

1. diagnose() turns the metrics (and any comparison problem sections) into a few problems, each
   with evidence sentences that quote measured values. Deterministic code, no LLM.
2. For each problem the knowledge base returns the closest practice docs for that problem tag,
   instrument and level.
3. With an API key, the LLM writes a summary, the top 3 issues and a 7-day plan, as structured
   output (LLMCoachOutput). It is told to cite only the given measurements and docs.
4. grounding_problems() then checks the answer: every evidence line must be one of ours, every
   source must be a retrieved doc, and every number in the text must appear in the measurements
   or the docs. If anything fails, the LLM text is discarded and the response is "basic mode".

Without a key (or if the LLM fails) the response is basic mode: the diagnosis and the retrieved
exercises as written in the docs, with no generated text.
"""
import re
from datetime import datetime
from functools import lru_cache
from pathlib import Path
from typing import Any, Optional

from langchain_core.prompts import ChatPromptTemplate
from langchain_core.runnables import Runnable

from app.core.config import settings
from app.schemas.coach import (
    CoachIssue,
    CoachResponse,
    DiagnosisItem,
    LLMCoachOutput,
    PlanDay,
    RetrievedExercise,
    SourceDoc,
)
from app.services.coach.diagnosis import Diagnosis, diagnose
from app.services.coach.knowledge import KNOWLEDGE_DIR, KnowledgeBase, RetrievedChunk, load_docs
from app.utils.logging import log

MAX_DIAGNOSES = 3        # problems sent to retrieval and the LLM (most severe first)
CHUNKS_PER_DIAGNOSIS = 2
# Metrics the diagnosis reads, and how to name them when they couldn't be measured.
REASON_LABELS = {
    "intonation_score": "Intonation",
    "pitch_stability_cents": "Pitch steadiness on held notes",
    "rhythm_score": "Timing",
    "tempo_drift_bpm": "Tempo drift",
    "tempo_stability_cv": "Pulse evenness",
}

SYSTEM_PROMPT = """You are a music practice coach. You write short, practical, encouraging advice.

Strict rules:
- Use ONLY the MEASUREMENTS and SOURCES given. Do not use outside knowledge about the student.
- Every "evidence" item must be copied EXACTLY, character for character, from the MEASUREMENTS list.
- Do not invent, estimate, round or convert numbers. The only numbers you may write are numbers
  that appear in the MEASUREMENTS or in the SOURCES text, and day numbers 1 to 7.
- Every exercise must come from one SOURCE, and "source_doc" must be that source's id.
- "how_long" must be the time the source doc gives.
- The 7-day plan must work on the issues you list, most severe first, and end with recording the
  same passage again to compare.
- If something isn't covered by the sources, leave it out rather than guessing."""

HUMAN_PROMPT = """STUDENT
Instrument: {instrument}
Level: {level}

MEASUREMENTS (grouped by problem, most severe first)
{measurements}

SOURCES
{sources}

Write the summary, the top issues (at most 3, one per problem above) and the 7-day plan."""


# --- Small pure helpers --------------------------------------------------------------------

_NUMBER = re.compile(r"\d+(?:\.\d+)?")
_HOW_LONG = re.compile(r"\*\*How long:\*\*\s*(.+)")


def numbers_in(text: str) -> set[str]:
    """Numbers in text, normalised so '+31.0', '31' and '31.0' compare equal; signs are dropped."""
    return {f"{float(n):g}" for n in _NUMBER.findall(text)}


def how_long_of(text: str) -> Optional[str]:
    """The doc's '**How long:** …' line, if it has one."""
    match = _HOW_LONG.search(text)
    return match.group(1).strip() if match else None


def short_how_long(how_long: str) -> str:
    """First sentence of a How-long line: '10 minutes a day. Re-record…' → '10 minutes a day'."""
    return how_long.split(". ")[0].rstrip(".")


def exercise_excerpt(text: str) -> str:
    """The '## Exercise…' section of a chunk (up to the next heading or the How-long line),
    or the chunk body without its title when there is no such section."""
    match = re.search(r"## (?:Exercise|Routine|Structure|Checklist|Check)[^\n]*\n(.*?)(?=\n## |\n\*\*How long|\Z)",
                      text, re.S)
    if match:
        return match.group(1).strip()
    body = text.split("\n", 1)[-1]
    return _HOW_LONG.sub("", body).strip()


def unavailable_notes(metrics: dict) -> list[str]:
    """'X was not measured: <reason>' for each metric the diagnosis uses that came back null."""
    reasons = metrics.get("unavailable_reasons") or {}
    return [f"{label} was not measured: {reasons[key]}" for key, label in REASON_LABELS.items() if key in reasons]


def grounding_problems(output: LLMCoachOutput, allowed_evidence: set[str],
                       sources: dict[str, RetrievedChunk]) -> list[str]:
    """Why an LLM answer can't be trusted ([] = grounded).

    Checks: evidence lines are verbatim measurements; source_doc ids were retrieved; every number
    in the generated text appears in the measurements or the retrieved docs (or is a day 1-7).
    """
    problems: list[str] = []
    allowed_numbers = set().union(*(numbers_in(e) for e in allowed_evidence),
                                  *(numbers_in(c.text) for c in sources.values()),
                                  {str(d) for d in range(1, 8)})
    texts = [output.summary]
    for issue in output.top_3_issues:
        for line in issue.evidence:
            if line.strip() not in allowed_evidence:
                problems.append(f"evidence not in the measurements: {line!r}")
        if issue.source_doc not in sources:
            problems.append(f"unknown source doc: {issue.source_doc!r}")
        texts += [issue.issue, issue.exercise, issue.how_long]
    for day in output.plan:
        texts += [day.focus, *day.tasks]
    invented = set().union(*(numbers_in(t) for t in texts)) - allowed_numbers
    if invented:
        problems.append(f"numbers not in the measurements or sources: {', '.join(sorted(invented))}")
    if [d.day for d in output.plan] != list(range(1, 8)):
        problems.append("plan days are not 1 to 7 in order")
    return problems


def basic_plan(diagnoses: list[Diagnosis], exercises: list[RetrievedExercise]) -> list[PlanDay]:
    """Fixed rotation (no LLM): days 1-6 cycle through the issues, most severe first; each day
    lists that issue's retrieved exercises. Day 7: record again and compare."""
    if not diagnoses:
        return []
    by_key: dict[str, list[RetrievedExercise]] = {}
    for e in exercises:
        by_key.setdefault(e.diagnosis_key, []).append(e)
    plan = []
    for day in range(1, 7):
        diagnosis = diagnoses[(day - 1) % len(diagnoses)]
        tasks = [e.source_doc.title + (f" ({short_how_long(e.how_long)})" if e.how_long else "")
                 for e in by_key.get(diagnosis.key, [])] or ["Slow practice on the passages flagged in the analysis"]
        plan.append(PlanDay(day=day, focus=diagnosis.label, tasks=tasks))
    plan.append(PlanDay(day=7, focus="Check your progress",
                        tasks=["Record the same passage again and run the analysis to compare"]))
    return plan


# --- Knowledge base and LLM (created once, overridable in tests) ---------------------------

@lru_cache(maxsize=1)
def get_knowledge_base() -> KnowledgeBase:
    """The Chroma index at CHROMA_DIR; built from knowledge/ on first use if it doesn't exist yet."""
    from sentence_transformers import SentenceTransformer  # slow import, only when the coach is used
    kb = KnowledgeBase(Path(settings.CHROMA_DIR), SentenceTransformer(settings.EMBEDDING_MODEL))
    if not kb.is_built():
        log.info("Knowledge index not found; building it from knowledge/")
        kb.rebuild(load_docs(KNOWLEDGE_DIR))
    return kb


def make_structured_llm() -> Optional[Runnable]:
    """Gemini with LLMCoachOutput as structured output, or None when no API key is configured."""
    if not (settings.LLM_API_KEY or "").strip():
        return None
    if settings.LLM_PROVIDER.lower() != "google":
        raise ValueError(f"LLM_PROVIDER={settings.LLM_PROVIDER!r} is not supported; use 'google'")
    from langchain_google_genai import ChatGoogleGenerativeAI
    llm = ChatGoogleGenerativeAI(model=settings.LLM_MODEL, api_key=settings.LLM_API_KEY,
                                 temperature=0.2, max_retries=1, timeout=60)
    return llm.with_structured_output(LLMCoachOutput)


# --- The pipeline ------------------------------------------------------------------------

def _format_measurements(diagnoses: list[Diagnosis]) -> str:
    return "\n".join(f"[{d.label}]\n" + "\n".join(f"- {e}" for e in d.evidence) for d in diagnoses)


def _format_sources(sources: dict[str, RetrievedChunk]) -> str:
    return "\n\n".join(f"<source id=\"{doc_id}\">\n{chunk.text}\n</source>" for doc_id, chunk in sources.items())


def build_coaching(analysis_id: int, metrics: dict, problem_sections: Optional[list[dict]],
                   instrument: Optional[str], level: Optional[str], kb: KnowledgeBase,
                   structured_llm: Optional[Runnable], model_name: Optional[str] = None) -> CoachResponse:
    """Run the whole pipeline for one analysis. structured_llm=None → basic mode."""
    notes = unavailable_notes(metrics)
    diagnoses = diagnose(metrics, problem_sections)[:MAX_DIAGNOSES]

    exercises: list[RetrievedExercise] = []
    sources: dict[str, RetrievedChunk] = {}
    if diagnoses:
        for d in diagnoses:
            for chunk in kb.retrieve(d.query, d.tag, instrument, level, k=CHUNKS_PER_DIAGNOSIS):
                sources.setdefault(chunk.doc_id, chunk)
                exercises.append(RetrievedExercise(diagnosis_key=d.key,
                                                   source_doc=SourceDoc(id=chunk.doc_id, title=chunk.title),
                                                   excerpt=exercise_excerpt(chunk.text), how_long=how_long_of(chunk.text)))
    else:
        notes.append("No measured metric crossed a problem threshold, so there is nothing specific to fix. "
                     "A warm-up routine is suggested to keep your playing in shape.")
        for chunk in kb.retrieve("daily warm-up routine", "warmup", instrument, level, k=1):
            exercises.append(RetrievedExercise(diagnosis_key="warmup",
                                               source_doc=SourceDoc(id=chunk.doc_id, title=chunk.title),
                                               excerpt=exercise_excerpt(chunk.text), how_long=how_long_of(chunk.text)))

    response = CoachResponse(
        analysis_id=analysis_id, mode="basic", created_at=datetime.utcnow(),
        diagnosis=[DiagnosisItem(key=d.key, tag=d.tag, label=d.label, evidence=d.evidence) for d in diagnoses],
        exercises=exercises, plan=basic_plan(diagnoses, exercises), notes=notes,
    )
    if not diagnoses:
        return response
    if structured_llm is None:
        response.notes.append("Basic mode: no LLM API key is configured, so this shows the measured diagnosis "
                              "and exercises from the practice library without generated advice.")
        return response

    chain = ChatPromptTemplate.from_messages([("system", SYSTEM_PROMPT), ("human", HUMAN_PROMPT)]) | structured_llm
    try:
        output = chain.invoke({"instrument": (instrument or "not specified").lower(),
                               "level": (level or "not specified").lower(),
                               "measurements": _format_measurements(diagnoses),
                               "sources": _format_sources(sources)})
        if isinstance(output, dict):
            output = LLMCoachOutput.model_validate(output)
    except Exception as e:  # network, quota, invalid JSON: fall back rather than fail the request
        log.warning(f"Coach LLM call failed for analysis {analysis_id}: {type(e).__name__}: {e}")
        response.notes.append(f"Basic mode: the language model could not be used ({type(e).__name__}).")
        return response

    allowed = {e for d in diagnoses for e in d.evidence}
    problems = grounding_problems(output, allowed, sources)
    if problems:
        log.warning(f"Coach LLM output rejected for analysis {analysis_id}: {problems}")
        response.notes.append("Basic mode: the generated advice was discarded because it cited something that "
                              "wasn't measured (" + "; ".join(problems) + ").")
        return response

    response.mode = "llm"
    response.model = model_name
    response.summary = output.summary
    response.top_issues = [CoachIssue(issue=i.issue, evidence=[e.strip() for e in i.evidence], exercise=i.exercise,
                                      how_long=i.how_long,
                                      source_doc=SourceDoc(id=i.source_doc, title=sources[i.source_doc].title))
                           for i in output.top_3_issues]
    response.plan = [PlanDay(day=d.day, focus=d.focus, tasks=d.tasks) for d in output.plan]
    return response


def metrics_dict(audio_features: Any) -> dict:
    """AudioFeatures row → plain dict (notes and unavailable_reasons parsed from JSON)."""
    from app.schemas.analysis import AudioFeaturesResponse
    return AudioFeaturesResponse.model_validate(audio_features).model_dump()
