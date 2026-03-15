"""Skill store — loads and caches .skill.md files for agents.

Each .skill.md has a YAML frontmatter (metadata) and a markdown body
(system prompt for LLM-driven agents). This module parses both and
caches the result so files are only read once.

Usage:
    from agents.skill_store import load_skill

    skill = load_skill("report")
    skill.metadata   # {'name': 'report', 'type': 'llm-driven', 'reads': [...], 'writes': [...]}
    skill.prompt     # Markdown body (everything after the YAML frontmatter)
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import yaml

_SKILLS_DIR = Path(__file__).parent / "skills"

# ---------------------------------------------------------------------------
# Data class returned by load_skill()
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class Skill:
    name: str
    metadata: dict
    prompt: str


# ---------------------------------------------------------------------------
# Cache: skill name → Skill
# ---------------------------------------------------------------------------
_cache: dict[str, Skill] = {}


def load_skill(name: str) -> Skill:
    """Load a skill by name (e.g. 'report' → skills/report.skill.md).

    Returns a Skill with .metadata (dict) and .prompt (str).
    Cached after first load.
    """
    if name in _cache:
        return _cache[name]

    path = _SKILLS_DIR / f"{name}.skill.md"
    if not path.exists():
        raise FileNotFoundError(f"Skill file not found: {path}")

    raw = path.read_text(encoding="utf-8")

    # Split on '---' to separate YAML frontmatter from body
    parts = raw.split("---", 2)
    if len(parts) >= 3:
        metadata = yaml.safe_load(parts[1]) or {}
        prompt = parts[2].strip()
    else:
        metadata = {}
        prompt = raw.strip()

    skill = Skill(name=name, metadata=metadata, prompt=prompt)
    _cache[name] = skill
    return skill
