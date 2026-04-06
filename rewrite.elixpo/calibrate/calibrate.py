"""Calibration pipeline — compare human vs AI text and tune detection weights.

1. Reads human samples from calibrate/samples/human_*.txt
2. Generates AI equivalents via kimi (same topic/abstract, AI-written body)
3. Runs all features on both sets
4. Prints comparison table + computes optimal weights
"""

import glob
import json
import os
import sys
import time

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.core.llm import chat
from app.detection.heuristics import score_all
from app.detection.linguistic import score_all_linguistic

SAMPLES_DIR = os.path.join(os.path.dirname(__file__), "samples")

# We use first ~800 words of each paper for consistency
MAX_WORDS = 800


def load_human_samples() -> list[dict]:
    """Load human-written samples from samples directory."""
    samples = []
    for path in sorted(glob.glob(os.path.join(SAMPLES_DIR, "human_*.txt"))):
        with open(path, "r", encoding="utf-8") as f:
            lines = f.readlines()

        # Extract metadata from header comments
        title = ""
        arxiv_id = ""
        text_lines = []
        for line in lines:
            if line.startswith("# ") and not title:
                title = line[2:].strip()
            elif line.startswith("# arXiv:"):
                arxiv_id = line.split(":", 1)[1].strip()
            elif not line.startswith("#"):
                text_lines.append(line)

        text = "".join(text_lines).strip()
        # Truncate to MAX_WORDS
        words = text.split()
        if len(words) > MAX_WORDS:
            text = " ".join(words[:MAX_WORDS])

        if len(text.split()) >= 200:  # need minimum for meaningful analysis
            samples.append({
                "id": arxiv_id,
                "title": title,
                "text": text,
                "source": os.path.basename(path),
            })

    return samples


def generate_ai_equivalent(title: str, text: str) -> str:
    """Generate an AI-written version on the same topic."""
    # Extract first ~200 words as context for the AI
    context_words = text.split()[:200]
    context = " ".join(context_words)

    prompt = f"""Write a research paper section (~500-700 words) on the same topic as the following paper.
Write it as if you are the author drafting the methodology, results, and discussion sections.
Match the academic register and technical depth. Do not copy any text — write entirely new content on the same subject.

Paper title: {title}
Paper excerpt (for topic context only):
{context}

Write the new section now. Output only the paper text, no headers or meta-commentary."""

    result = chat(
        messages=[
            {"role": "system", "content": "You are an academic researcher writing a paper in your field of expertise."},
            {"role": "user", "content": prompt},
        ],
        temperature=0.9,
        seed=-1,
    )
    return result.strip()


def score_text(text: str) -> dict[str, float]:
    """Run all heuristic + linguistic scorers on text."""
    features = score_all(text)
    features.update(score_all_linguistic(text))
    return features


def run_calibration():
    """Main calibration pipeline."""
    print("=" * 70)
    print("  ReWrite Calibration Pipeline")
    print("=" * 70)

    # 1. Load human samples
    human_samples = load_human_samples()
    print(f"\nLoaded {len(human_samples)} human samples")

    if len(human_samples) < 5:
        print("ERROR: Need at least 5 human samples. Run fetch_arxiv.py first.")
        return

    # 2. Score human samples
    print("\n--- Scoring human samples ---")
    human_scores = []
    for i, sample in enumerate(human_samples):
        print(f"  [{i+1}/{len(human_samples)}] {sample['title'][:60]}...", end=" ")
        features = score_text(sample["text"])
        human_scores.append(features)
        print(f"OK")

    # 3. Generate and score AI equivalents
    print("\n--- Generating AI equivalents via kimi ---")
    ai_scores = []
    for i, sample in enumerate(human_samples):
        print(f"  [{i+1}/{len(human_samples)}] Generating AI version of: {sample['title'][:50]}...", end=" ")
        try:
            ai_text = generate_ai_equivalent(sample["title"], sample["text"])

            # Save AI sample for reference
            safe_id = sample["id"].replace("/", "_")
            ai_path = os.path.join(SAMPLES_DIR, f"ai_{safe_id}.txt")
            with open(ai_path, "w", encoding="utf-8") as f:
                f.write(f"# AI-generated equivalent of: {sample['title']}\n")
                f.write(f"# Original arXiv: {sample['id']}\n\n")
                f.write(ai_text)

            features = score_text(ai_text)
            ai_scores.append(features)
            print("OK")
        except Exception as e:
            print(f"FAILED ({e})")
            # Use None placeholder
            ai_scores.append(None)

        time.sleep(1)  # rate limit

    # Filter out failures
    paired = [(h, a) for h, a in zip(human_scores, ai_scores) if a is not None]
    human_valid = [p[0] for p in paired]
    ai_valid = [p[1] for p in paired]

    if len(paired) < 3:
        print("\nERROR: Not enough successful AI generations for calibration.")
        return

    print(f"\n{len(paired)} successful pairs for calibration")

    # 4. Compute averages and separation
    all_features = list(human_valid[0].keys())

    print("\n" + "=" * 70)
    print(f"  {'Feature':<24} {'Human Avg':>10} {'AI Avg':>10} {'Gap':>8} {'Sep. Power':>12}")
    print("=" * 70)

    separations = {}
    for feat in all_features:
        h_vals = [s[feat] for s in human_valid]
        a_vals = [s[feat] for s in ai_valid]

        h_avg = sum(h_vals) / len(h_vals)
        a_avg = sum(a_vals) / len(a_vals)
        gap = a_avg - h_avg  # positive = AI scores higher (good)

        # Separation power: gap / pooled std (like Cohen's d)
        import math
        h_var = sum((v - h_avg) ** 2 for v in h_vals) / len(h_vals)
        a_var = sum((v - a_avg) ** 2 for v in a_vals) / len(a_vals)
        pooled_std = math.sqrt((h_var + a_var) / 2) or 1
        cohens_d = gap / pooled_std

        separations[feat] = {
            "h_avg": h_avg,
            "a_avg": a_avg,
            "gap": gap,
            "cohens_d": cohens_d,
        }

        # Color coding
        if abs(cohens_d) > 1.0:
            marker = "***"
        elif abs(cohens_d) > 0.5:
            marker = "** "
        elif abs(cohens_d) > 0.2:
            marker = "*  "
        else:
            marker = "   "

        print(f"  {feat:<24} {h_avg:>9.1f}% {a_avg:>9.1f}% {gap:>+7.1f}% {cohens_d:>+8.2f} {marker}")

    # 5. Compute optimal weights based on separation power
    print("\n" + "=" * 70)
    print("  RECOMMENDED WEIGHTS (based on separation power)")
    print("=" * 70)

    # Use absolute Cohen's d as weight, normalized
    raw_weights = {}
    for feat, info in separations.items():
        # Only use features where AI scores HIGHER (correct direction)
        d = info["cohens_d"]
        raw_weights[feat] = max(0, d)  # only positive separation counts

    total_weight = sum(raw_weights.values()) or 1
    normalized = {k: v / total_weight for k, v in raw_weights.items()}

    # Print sorted by weight
    for feat, weight in sorted(normalized.items(), key=lambda x: -x[1]):
        bar = "█" * int(weight * 50)
        print(f"  {feat:<24} {weight:.3f}  {bar}")

    # 6. Save results
    results = {
        "n_pairs": len(paired),
        "separations": separations,
        "recommended_weights": {k: round(v, 4) for k, v in normalized.items()},
    }

    results_path = os.path.join(os.path.dirname(__file__), "calibration_results.json")
    with open(results_path, "w") as f:
        json.dump(results, f, indent=2)
    print(f"\nResults saved to {results_path}")

    # 7. Generate config update suggestion
    print("\n" + "=" * 70)
    print("  SUGGESTED CONFIG UPDATE (paste into core/config.py)")
    print("=" * 70)
    print("\nHEURISTIC_WEIGHTS = {")
    for feat, weight in sorted(normalized.items(), key=lambda x: -x[1]):
        if feat != "llm_judge":
            print(f'    "{feat}": {weight:.3f},')
    print("}")

    print(f"\n# LLM judge weight for ENSEMBLE_WEIGHTS:")
    print(f"# Assign ~0.20-0.30 to llm_judge, scale the rest proportionally")


if __name__ == "__main__":
    run_calibration()
