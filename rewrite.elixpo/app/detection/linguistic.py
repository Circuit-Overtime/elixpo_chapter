"""Deep linguistic analysis for AI detection.

Goes beyond marker words to analyze the fundamental statistical properties
of the language itself — how it was *generated*, not what words it uses.

All features are CPU-based using nltk and numpy. No GPU required.
"""

import math
import re
from collections import Counter, defaultdict

import numpy as np
import nltk

try:
    nltk.data.find("tokenizers/punkt_tab")
except LookupError:
    nltk.download("punkt_tab", quiet=True)

from nltk.tokenize import sent_tokenize, word_tokenize


# ---------------------------------------------------------------------------
# 1. PERPLEXITY ESTIMATION (n-gram based)
# ---------------------------------------------------------------------------
# AI text is abnormally predictable. We estimate "surprise" using how well
# a simple bigram model predicts each next word. Low surprise = AI-like.

def _build_ngram_model(words: list[str], n: int = 2) -> dict:
    """Build a simple n-gram frequency model from the text itself."""
    model = defaultdict(Counter)
    lower_words = [w.lower() for w in words]
    for i in range(len(lower_words) - n):
        context = tuple(lower_words[i:i + n - 1])
        target = lower_words[i + n - 1]
        model[context][target] += 1
    return model


def score_perplexity(text: str) -> float:
    """Estimate perplexity via self-surprise.

    Splits text in half: builds bigram model on first half, measures how
    predictable the second half is. AI text is more self-consistent,
    so the second half is highly predictable from the first.

    Returns 0-100 where high = AI-like (low perplexity / very predictable).
    """
    words = word_tokenize(text.lower())
    if len(words) < 60:
        return 50.0

    mid = len(words) // 2
    train_words = words[:mid]
    test_words = words[mid:]

    # Build bigram model from first half
    model = defaultdict(Counter)
    for i in range(len(train_words) - 1):
        model[(train_words[i],)][train_words[i + 1]] += 1

    # Normalize to probabilities
    for context in model:
        total = sum(model[context].values())
        for word in model[context]:
            model[context][word] /= total

    # Measure surprise on second half
    surprises = []
    for i in range(len(test_words) - 1):
        context = (test_words[i],)
        next_word = test_words[i + 1]
        prob = model.get(context, {}).get(next_word, 0)
        if prob > 0:
            surprises.append(-math.log2(prob))
        # Unknown context/word pairs are skipped (not informative)

    if len(surprises) < 10:
        return 50.0

    avg_surprise = sum(surprises) / len(surprises)

    # Human text: avg surprise ~4-6 bits (unpredictable)
    # AI text: avg surprise ~2-3.5 bits (self-consistent, predictable)
    # Map: 2.0 → 100 (very AI), 6.0+ → 0 (very human)
    ai_score = max(0, min(100, (6.0 - avg_surprise) / 4.0 * 100))
    return ai_score


# ---------------------------------------------------------------------------
# 2. N-GRAM FREQUENCY UNIFORMITY
# ---------------------------------------------------------------------------
# AI text has smoother, more uniform n-gram distributions.
# Human text is "spikier" — certain phrases repeat while most appear once.

def score_ngram_uniformity(text: str) -> float:
    """Score how uniform the bigram frequency distribution is.

    AI text distributes bigrams more evenly (flatter distribution).
    Human text has more extreme peaks and long tails.

    Returns 0-100 where high = AI-like (uniform distribution).
    """
    words = word_tokenize(text.lower())
    if len(words) < 40:
        return 50.0

    # Count bigrams
    bigrams = [(words[i], words[i + 1]) for i in range(len(words) - 1)]
    counts = Counter(bigrams)

    if len(counts) < 10:
        return 50.0

    freqs = np.array(sorted(counts.values(), reverse=True), dtype=float)
    freqs = freqs / freqs.sum()

    # Measure distribution shape via entropy
    # High entropy = uniform distribution = AI-like
    entropy = -np.sum(freqs * np.log2(freqs + 1e-10))
    max_entropy = math.log2(len(freqs))

    if max_entropy == 0:
        return 50.0

    normalized_entropy = entropy / max_entropy

    # Human text: normalized entropy ~0.85-0.92 (spikier)
    # AI text: normalized entropy ~0.93-0.98 (more uniform)
    # Map: 0.97 → 90, 0.85 → 10
    ai_score = max(0, min(100, (normalized_entropy - 0.85) / 0.12 * 80 + 10))
    return ai_score


# ---------------------------------------------------------------------------
# 3. COHERENCE SCORING
# ---------------------------------------------------------------------------
# AI text is *too* coherent — every sentence connects tightly to the next.
# Human text has more topic jumps, tangents, and loose connections.
# We measure this via word overlap between consecutive sentences.

def score_coherence(text: str) -> float:
    """Score inter-sentence coherence via lexical overlap.

    AI text has unnaturally high sentence-to-sentence word overlap.

    Returns 0-100 where high = AI-like (too cohesive).
    """
    sentences = sent_tokenize(text)
    if len(sentences) < 4:
        return 50.0

    # Compute Jaccard similarity between consecutive sentences
    overlaps = []
    for i in range(len(sentences) - 1):
        words_a = set(word_tokenize(sentences[i].lower())) - _STOPWORDS
        words_b = set(word_tokenize(sentences[i + 1].lower())) - _STOPWORDS

        if not words_a or not words_b:
            continue

        jaccard = len(words_a & words_b) / len(words_a | words_b)
        overlaps.append(jaccard)

    if len(overlaps) < 3:
        return 50.0

    avg_overlap = sum(overlaps) / len(overlaps)
    # Also check variance — AI has consistent overlap, humans vary
    overlap_var = sum((o - avg_overlap) ** 2 for o in overlaps) / len(overlaps)

    # Human text: avg overlap ~0.05-0.12, high variance
    # AI text: avg overlap ~0.12-0.22, low variance
    overlap_score = max(0, min(100, (avg_overlap - 0.05) / 0.17 * 100))
    consistency_score = max(0, min(100, (1 - overlap_var / 0.01) * 50))

    return min(100, overlap_score * 0.7 + consistency_score * 0.3)


# ---------------------------------------------------------------------------
# 4. READABILITY METRICS
# ---------------------------------------------------------------------------
# AI text clusters at specific grade levels (~10-13 Flesch-Kincaid).
# Human academic writing is more variable.

def _syllable_count(word: str) -> int:
    """Estimate syllable count using vowel groups."""
    word = word.lower().strip(".,!?;:\"'()")
    if not word:
        return 1
    vowels = "aeiouy"
    count = 0
    prev_vowel = False
    for char in word:
        is_vowel = char in vowels
        if is_vowel and not prev_vowel:
            count += 1
        prev_vowel = is_vowel
    if word.endswith("e") and count > 1:
        count -= 1
    return max(1, count)


def score_readability(text: str) -> float:
    """Score readability clustering. AI text hits suspiciously consistent grade levels.

    Returns 0-100 where high = AI-like (clustered readability).
    """
    sentences = sent_tokenize(text)
    words = word_tokenize(text)

    if len(sentences) < 3 or len(words) < 50:
        return 50.0

    total_syllables = sum(_syllable_count(w) for w in words)
    avg_words_per_sent = len(words) / len(sentences)
    avg_syllables_per_word = total_syllables / len(words)

    # Flesch-Kincaid Grade Level
    fk_grade = 0.39 * avg_words_per_sent + 11.8 * avg_syllables_per_word - 15.59

    # AI text clusters at grade 10-13. Outside this range = more human-like.
    if 10 <= fk_grade <= 13:
        grade_score = 70 + (1 - abs(fk_grade - 11.5) / 1.5) * 30
    elif 8 <= fk_grade <= 15:
        grade_score = 40
    else:
        grade_score = 15

    # Also check per-paragraph readability consistency
    para_grades = []
    paragraphs = [p.strip() for p in text.split("\n\n") if len(p.strip()) > 50]
    for para in paragraphs:
        p_sents = sent_tokenize(para)
        p_words = word_tokenize(para)
        if len(p_sents) < 1 or len(p_words) < 10:
            continue
        p_syllables = sum(_syllable_count(w) for w in p_words)
        p_grade = 0.39 * (len(p_words) / len(p_sents)) + 11.8 * (p_syllables / len(p_words)) - 15.59
        para_grades.append(p_grade)

    if len(para_grades) >= 3:
        grade_var = np.var(para_grades)
        # AI: low variance (~0.5-2.0), Human: higher variance (~3.0-8.0)
        consistency_score = max(0, min(100, (5.0 - grade_var) / 5.0 * 80))
        return min(100, grade_score * 0.5 + consistency_score * 0.5)

    return grade_score


# ---------------------------------------------------------------------------
# 5. REPETITION PATTERNS
# ---------------------------------------------------------------------------
# AI repeats syntactic templates — similar sentence structures, dependency
# patterns, and transitional constructions across paragraphs.

def score_repetition(text: str) -> float:
    """Score structural repetition via POS-tag pattern analysis.

    AI reuses the same sentence templates. We approximate this by looking
    at sentence-opening patterns and length-structure templates.

    Returns 0-100 where high = AI-like (repetitive structure).
    """
    sentences = sent_tokenize(text)
    if len(sentences) < 5:
        return 50.0

    # Extract structural templates: (first_2_words, sentence_length_bucket)
    templates = []
    for s in sentences:
        words = s.strip().split()
        if len(words) < 3:
            continue
        opener = f"{words[0].lower()} {words[1].lower()}"
        length_bucket = len(words) // 5 * 5  # bucket by 5s
        templates.append((opener, length_bucket))

    if len(templates) < 5:
        return 50.0

    # Check opener repetition
    opener_counts = Counter(t[0] for t in templates)
    most_common_ratio = opener_counts.most_common(1)[0][1] / len(templates)

    # Check template repetition (opener + length bucket)
    template_counts = Counter(templates)
    unique_ratio = len(template_counts) / len(templates)

    # Check for repeated transition patterns
    transition_words = ["this", "the", "in", "it", "these", "however", "moreover",
                        "additionally", "furthermore", "consequently"]
    transition_starts = sum(1 for t in templates if t[0].split()[0] in transition_words)
    transition_ratio = transition_starts / len(templates)

    # Combine signals
    opener_score = max(0, min(100, most_common_ratio * 300))
    diversity_score = max(0, min(100, (1 - unique_ratio) * 200))
    transition_score = max(0, min(100, transition_ratio * 200))

    return min(100, opener_score * 0.3 + diversity_score * 0.4 + transition_score * 0.3)


# ---------------------------------------------------------------------------
# 6. ENTROPY ANALYSIS
# ---------------------------------------------------------------------------
# AI text has lower character-level and word-level information entropy.

def score_entropy(text: str) -> float:
    """Score information entropy at word level.

    AI text is more compressible / lower entropy than human text.

    Returns 0-100 where high = AI-like (low entropy).
    """
    words = word_tokenize(text.lower())
    if len(words) < 30:
        return 50.0

    # Word-level entropy
    word_counts = Counter(words)
    total = len(words)
    probs = np.array([c / total for c in word_counts.values()])
    word_entropy = -np.sum(probs * np.log2(probs))

    # Normalize by vocabulary size for fair comparison
    max_possible = math.log2(len(word_counts)) if len(word_counts) > 1 else 1
    normalized = word_entropy / max_possible if max_possible > 0 else 0

    # Also compute character-level entropy on the raw text
    char_counts = Counter(text.lower())
    char_total = len(text)
    char_probs = np.array([c / char_total for c in char_counts.values()])
    char_entropy = -np.sum(char_probs * np.log2(char_probs))

    # Human text: word normalized entropy ~0.92-0.97, char entropy ~4.2-4.8
    # AI text: word normalized entropy ~0.88-0.93, char entropy ~3.8-4.3
    word_score = max(0, min(100, (0.97 - normalized) / 0.09 * 80 + 10))
    char_score = max(0, min(100, (4.8 - char_entropy) / 1.0 * 80 + 10))

    return min(100, word_score * 0.6 + char_score * 0.4)


# ---------------------------------------------------------------------------
# Stopwords (minimal set to avoid nltk corpus download)
# ---------------------------------------------------------------------------
_STOPWORDS = {
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
    "of", "with", "by", "from", "is", "are", "was", "were", "be", "been",
    "being", "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "can", "shall", "it", "its",
    "this", "that", "these", "those", "i", "you", "he", "she", "we",
    "they", "me", "him", "her", "us", "them", "my", "your", "his",
    "our", "their", "not", "no", "as", "if", "so", "than", "then",
}


# ---------------------------------------------------------------------------
# Combined scorer
# ---------------------------------------------------------------------------

def score_all_linguistic(text: str) -> dict[str, float]:
    """Run all deep linguistic scorers. Returns feature name → score (0-100)."""
    return {
        "perplexity": round(score_perplexity(text), 1),
        "n_gram_uniformity": round(score_ngram_uniformity(text), 1),
        "coherence": round(score_coherence(text), 1),
        "readability": round(score_readability(text), 1),
        "repetition": round(score_repetition(text), 1),
        "entropy": round(score_entropy(text), 1),
    }
