"""Fetch real research papers from arXiv for calibration.

Uses arXiv API to search for papers, then downloads the .tex source
from the e-print endpoint. Extracts abstract + introduction/body sections.
"""

import io
import os
import re
import sys
import time
import tarfile
import gzip
import urllib.request
import urllib.parse
import xml.etree.ElementTree as ET

ARXIV_API = "http://export.arxiv.org/api/query"
ARXIV_EPRINT = "https://arxiv.org/e-print/"

SAMPLES_DIR = os.path.join(os.path.dirname(__file__), "samples")
os.makedirs(SAMPLES_DIR, exist_ok=True)


def search_arxiv(query: str = "cat:cs.CL", max_results: int = 15) -> list[dict]:
    """Search arXiv API and return paper metadata."""
    params = urllib.parse.urlencode({
        "search_query": query,
        "start": 0,
        "max_results": max_results,
        "sortBy": "submittedDate",
        "sortOrder": "descending",
    })
    url = f"{ARXIV_API}?{params}"
    print(f"Searching arXiv: {query} (max {max_results})...")

    req = urllib.request.Request(url, headers={"User-Agent": "ReWrite-Calibrator/1.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = resp.read().decode()

    # Parse Atom XML
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    root = ET.fromstring(data)

    papers = []
    for entry in root.findall("atom:entry", ns):
        arxiv_id_url = entry.find("atom:id", ns).text
        arxiv_id = arxiv_id_url.split("/abs/")[-1]
        # Strip version (e.g., 2401.12345v2 → 2401.12345)
        arxiv_id = re.sub(r"v\d+$", "", arxiv_id)

        title = entry.find("atom:title", ns).text.strip().replace("\n", " ")
        abstract = entry.find("atom:summary", ns).text.strip().replace("\n", " ")

        papers.append({
            "id": arxiv_id,
            "title": title,
            "abstract": abstract,
        })

    print(f"Found {len(papers)} papers.")
    return papers


def download_tex_source(arxiv_id: str) -> str | None:
    """Download and extract .tex source for a paper. Returns tex content or None."""
    url = f"{ARXIV_EPRINT}{arxiv_id}"
    print(f"  Downloading source: {arxiv_id}...", end=" ")

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "ReWrite-Calibrator/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
            content_type = resp.headers.get("Content-Type", "")
    except Exception as e:
        print(f"FAILED ({e})")
        return None

    # arXiv returns either a .tar.gz, .gz, or raw .tex
    tex_content = None

    # Try as tar.gz first
    try:
        with tarfile.open(fileobj=io.BytesIO(raw), mode="r:gz") as tar:
            # Find the main .tex file (usually the largest one)
            tex_files = [m for m in tar.getmembers() if m.name.endswith(".tex")]
            if not tex_files:
                print("NO .tex found in archive")
                return None

            # Pick the largest .tex file (likely the main paper)
            main_tex = max(tex_files, key=lambda m: m.size)
            f = tar.extractfile(main_tex)
            if f:
                tex_content = f.read().decode("utf-8", errors="replace")
                print(f"OK ({main_tex.name}, {len(tex_content)} chars)")
    except tarfile.TarError:
        # Try as plain gzip
        try:
            tex_content = gzip.decompress(raw).decode("utf-8", errors="replace")
            print(f"OK (gzip, {len(tex_content)} chars)")
        except Exception:
            # Try as raw tex
            try:
                tex_content = raw.decode("utf-8", errors="replace")
                if "\\begin{document}" in tex_content:
                    print(f"OK (raw, {len(tex_content)} chars)")
                else:
                    print("NOT a .tex file")
                    return None
            except Exception:
                print("FAILED (unknown format)")
                return None

    return tex_content


def extract_body_text(tex: str) -> str:
    """Extract readable text from .tex source, stripping LaTeX commands."""
    # Get body between \begin{document} and \end{document}
    body_match = re.search(r"\\begin\{document\}(.*?)\\end\{document\}", tex, re.DOTALL)
    body = body_match.group(1) if body_match else tex

    # Remove comments
    body = re.sub(r"(?<!\\)%.*$", "", body, flags=re.MULTILINE)

    # Remove figure/table environments
    for env in ["figure", "table", "tikzpicture", "algorithm", "lstlisting"]:
        body = re.sub(rf"\\begin\{{{env}\}}.*?\\end\{{{env}\}}", "", body, flags=re.DOTALL)

    # Remove display math
    body = re.sub(r"\\\[.*?\\\]", " [equation] ", body, flags=re.DOTALL)
    for env in ["equation", "align", "gather", "eqnarray", "multline"]:
        body = re.sub(rf"\\begin\{{{env}\*?\}}.*?\\end\{{{env}\*?\}}", " [equation] ", body, flags=re.DOTALL)

    # Replace inline math
    body = re.sub(r"\$([^$]+)\$", r" \1 ", body)

    # Extract text from commands
    for cmd in ["textbf", "textit", "emph", "underline", "texttt", "text", "mathrm"]:
        body = re.sub(rf"\\{cmd}\{{([^}}]*)\}}", r"\1", body)

    # Citations and refs
    body = re.sub(r"\\cite[tp]?\*?\{[^}]*\}", "[citation]", body)
    body = re.sub(r"\\(?:ref|eqref|autoref|cref)\{[^}]*\}", "[ref]", body)
    body = re.sub(r"\\label\{[^}]*\}", "", body)
    body = re.sub(r"\\footnote\{([^}]*)\}", r" (\1)", body)

    # Strip section commands but keep the text
    body = re.sub(r"\\(?:sub)*section\*?\{([^}]*)\}", r"\n\n\1\n\n", body)

    # Remove remaining commands
    body = re.sub(r"\\begin\{(?:itemize|enumerate)\}", "", body)
    body = re.sub(r"\\end\{(?:itemize|enumerate)\}", "", body)
    body = re.sub(r"\\item\s*", "", body)
    body = re.sub(r"\\maketitle", "", body)
    body = re.sub(r"\\tableofcontents", "", body)
    body = re.sub(r"\\[a-zA-Z]+\*?(?:\[[^\]]*\])?\{([^}]*)\}", r"\1", body)
    body = re.sub(r"\\[a-zA-Z]+\*?", " ", body)

    # Clean up
    body = body.replace("{", "").replace("}", "")
    body = re.sub(r"[ \t]+", " ", body)
    body = re.sub(r"\n{3,}", "\n\n", body)

    return body.strip()


def fetch_and_save(
    query: str = "cat:cs.CL OR cat:cs.AI OR cat:cs.LG",
    max_papers: int = 15,
    min_words: int = 500,
):
    """Fetch papers from arXiv and save extracted text as samples."""
    papers = search_arxiv(query, max_results=max_papers * 2)  # fetch extra in case some fail

    saved = 0
    for paper in papers:
        if saved >= max_papers:
            break

        tex = download_tex_source(paper["id"])
        if not tex:
            time.sleep(1)  # be polite to arXiv
            continue

        body = extract_body_text(tex)
        words = len(body.split())

        if words < min_words:
            print(f"  Skipping {paper['id']}: only {words} words after extraction")
            time.sleep(1)
            continue

        # Save
        safe_id = paper["id"].replace("/", "_")
        out_path = os.path.join(SAMPLES_DIR, f"human_{safe_id}.txt")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(f"# {paper['title']}\n")
            f.write(f"# arXiv: {paper['id']}\n")
            f.write(f"# Words: {words}\n\n")
            f.write(body)

        saved += 1
        print(f"  Saved: {out_path} ({words} words)")
        time.sleep(3)  # arXiv rate limit: 1 request per 3 seconds

    print(f"\nDone. Saved {saved} human-written samples to {SAMPLES_DIR}/")
    return saved


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    fetch_and_save(max_papers=n)
