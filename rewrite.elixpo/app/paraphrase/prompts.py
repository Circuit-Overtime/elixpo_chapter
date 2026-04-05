"""Prompt templates for paraphrasing — detection-aware, strict academic register."""

SYSTEM_PROMPT = """You are a human researcher rewriting a passage in your own words. Write exactly as a real academic would — imperfect, natural, with your own rhythm.

CRITICAL TECHNIQUES (do ALL of these):

1. SENTENCE LENGTH VARIATION — This is the #1 signal detectors use. You MUST mix:
   - Very short sentences (3-7 words): "This matters." "The gap is clear." "Results varied."
   - Medium sentences (12-20 words)
   - Long, complex sentences (30-45 words) with embedded clauses, dashes, or parentheticals
   Never write two consecutive sentences of similar length. Aim for a pattern like: 6, 32, 11, 41, 5, 22 words.

2. BREAK PREDICTABILITY — Detectors measure how predictable each word is given the previous words. To defeat this:
   - Start sentences with unexpected words: numbers, subordinate clauses, prepositional phrases, quotes, or the object instead of the subject
   - Use parenthetical asides mid-sentence (like this one) to interrupt flow
   - Occasionally use informal-but-academic constructions: "Interestingly enough," or "What stands out here is" or "— and this proved critical —"
   - Place qualifiers and caveats in unexpected positions within the sentence

3. AVOID AI VOCABULARY — Never use these words: comprehensive, crucial, moreover, furthermore, utilize, leverage, facilitate, robust, seamless, groundbreaking, paradigm, pivotal, intricate, multifaceted, endeavor, streamline, harness, foster, bolster, meticulous, realm, holistic, synergy, overarching, underscores, testament, notably, landscape, cutting-edge, delve, tapestry, commendable, ever-evolving. Use plain alternatives instead.

4. DROP FORMULAIC TRANSITIONS — Do NOT connect every idea with transition words. Real writers often just start a new thought. Delete "However," "Additionally," "Furthermore," "Moreover," at sentence starts. Instead: just state the next idea. Or use a dash. Or start with the evidence itself.

5. SHOW HUMAN VOICE — Write as yourself:
   - Use "we" naturally: "we found," "our results suggest," "we were surprised to see"
   - Add honest hedges: "though this is preliminary," "admittedly," "it remains unclear whether"
   - Occasionally show reasoning process: "At first glance this seems X, but on closer inspection..."

6. VARY STRUCTURE — Never repeat a grammatical pattern. If one sentence is Subject-Verb-Object, the next should be a different construction entirely. Use inverted sentences, questions, fragments (sparingly), lists within prose, em-dashes for asides.

RULES:
- Maintain academic register. This is a research paper.
- Preserve ALL factual content, data, numbers, citations, and technical terms exactly.
- Do not add or remove information.
- Keep output within 20% of the input word count.
- Output ONLY the rewritten text. No commentary."""

INTENSITY_ADDENDA = {
    "light": """
Light edit: rephrase sentences and swap word choices. Keep structure and idea order. Still vary sentence lengths.""",

    "medium": """
Restructure sentences substantially. Reorder clauses, combine some, split others. Switch between active and passive. This should read like a different author wrote it.""",

    "aggressive": """
Completely rebuild every sentence from scratch. Same facts, totally different wording and structure.

MANDATORY for this rewrite:
- At least 2 sentences must be under 7 words
- At least 1 sentence must be over 35 words with embedded clauses
- Start at least 3 sentences with something OTHER than the subject (e.g., "Despite X,", "In 2019,", "Surprisingly,", a prepositional phrase, or a dependent clause)
- Use at least 2 parenthetical asides, 1 semicolon, and 1 em-dash
- Do NOT start any sentence with "Furthermore", "Moreover", "Additionally", "It is", or "This is"
- Reorder the ideas within each paragraph — present them in a different sequence while keeping logical flow""",
}

DOMAIN_ADDENDA = {
    "cs": """
DOMAIN: Computer Science — Preserve all code, algorithms, complexity notations, and system names exactly. Technical precision is paramount.""",

    "medicine": """
DOMAIN: Medicine — Preserve ALL drug names, dosages, p-values, confidence intervals, and clinical terminology exactly.""",

    "law": """
DOMAIN: Law — Preserve ALL case citations, statute references, and legal terminology exactly.""",

    "humanities": """
DOMAIN: Humanities — Preserve ALL direct quotes, author names, and page references exactly.""",

    "general": "",
}


def build_messages(
    text: str,
    intensity: str = "medium",
    domain: str = "general",
    context: str = "",
    feedback: str = "",
) -> list[dict]:
    """Build the message list for the paraphraser.

    Args:
        text: Text to paraphrase.
        intensity: "light", "medium", or "aggressive".
        domain: Domain for prompt specialization.
        context: Optional surrounding context for coherence.
        feedback: Optional detection feedback from previous attempt.
    """
    system = SYSTEM_PROMPT

    addendum = INTENSITY_ADDENDA.get(intensity, INTENSITY_ADDENDA["medium"])
    system += "\n" + addendum

    domain_addendum = DOMAIN_ADDENDA.get(domain, "")
    if domain_addendum:
        system += "\n" + domain_addendum

    if intensity == "light":
        user_msg = "Rephrase this text while keeping the structure mostly intact:\n\n"
    elif intensity == "aggressive":
        user_msg = "Rewrite this text completely — same facts, different expression throughout:\n\n"
    else:
        user_msg = "Rewrite this text to sound naturally written by a human researcher:\n\n"

    if context:
        user_msg += f"[SURROUNDING CONTEXT — do NOT rewrite this, use for coherence only]\n{context}\n\n[TEXT TO REWRITE]\n"

    user_msg += text

    if feedback:
        user_msg += f"\n\n[DETECTION FEEDBACK — your previous rewrite was still detected. Fix these specific issues]\n{feedback}"

    return [
        {"role": "system", "content": system},
        {"role": "user", "content": user_msg},
    ]


def build_detection_feedback(text: str, features: dict) -> str:
    """Build specific, actionable feedback from detection results.

    Tells the LLM exactly what the detector caught and how to fix it.
    """
    from nltk.tokenize import sent_tokenize, word_tokenize
    lines = []

    # Sentence length analysis
    sentences = sent_tokenize(text)
    lengths = [len(s.split()) for s in sentences]
    if len(lengths) >= 3:
        avg_len = sum(lengths) / len(lengths)
        import math
        variance = sum((l - avg_len) ** 2 for l in lengths) / len(lengths)
        cv = math.sqrt(variance) / avg_len if avg_len > 0 else 0

        lines.append(f"SENTENCE LENGTHS: Your sentences are {', '.join(str(l) for l in lengths[:10])} words long.")
        if cv < 0.4:
            lines.append(f"  Problem: Too uniform (CV={cv:.2f}). Humans have CV>0.5. Mix in 3-6 word sentences and 30+ word sentences.")

    # Burstiness
    if features.get("burstiness", 0) > 30:
        lines.append(f"BURSTINESS: {features['burstiness']:.0f}% (too uniform). Your sentence lengths are too similar. Add very short and very long sentences.")

    # Vocabulary
    if features.get("vocabulary_markers", 0) > 20:
        lines.append(f"AI VOCABULARY: {features['vocabulary_markers']:.0f}%. You are using words that AI text detectors flag. Replace formal filler words with specific, concrete alternatives.")

    # N-gram uniformity
    if features.get("n_gram_uniformity", 0) > 50:
        lines.append(f"N-GRAM UNIFORMITY: {features['n_gram_uniformity']:.0f}%. Your word sequences are too predictable. Use more unexpected word pairings and less common phrasings.")

    # Repetition
    if features.get("repetition", 0) > 25:
        # Find repeated starters
        starters = [s.split()[0].lower() for s in sentences if s.split()]
        from collections import Counter
        starter_counts = Counter(starters).most_common(3)
        repeated = [f'"{w}" ({c}x)' for w, c in starter_counts if c > 1]
        if repeated:
            lines.append(f"REPEATED STARTERS: {', '.join(repeated)}. Each sentence must start differently.")

    # Paragraph structure
    if features.get("paragraph_structure", 0) > 30:
        lines.append(f"PARAGRAPH STRUCTURE: {features['paragraph_structure']:.0f}%. Your paragraphs are too uniform in length. Vary them.")

    # Punctuation
    if features.get("punctuation_diversity", 0) > 40:
        lines.append(f"PUNCTUATION: {features['punctuation_diversity']:.0f}%. Use more varied punctuation — semicolons, dashes, parentheses, colons.")

    if not lines:
        lines.append("The text still reads as AI-generated. Restructure sentences more dramatically. Vary lengths. Use unexpected phrasing.")

    return "\n".join(lines)
