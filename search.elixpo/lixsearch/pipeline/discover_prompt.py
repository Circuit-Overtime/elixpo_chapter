DISCOVER_CATEGORIES = ["tech", "finance", "sports", "entertainment", "arts"]

CATEGORY_SEARCH_QUERIES = {
    "tech": "latest technology news today AI software hardware",
    "finance": "latest finance news today markets economy stocks",
    "sports": "latest sports news today scores results highlights",
    "entertainment": "latest entertainment news today movies music celebrities",
    "arts": "latest arts culture news today exhibitions museums literature",
}

CATEGORY_DISPLAY_NAMES = {
    "tech": "Technology",
    "finance": "Finance",
    "sports": "Sports",
    "entertainment": "Entertainment",
    "arts": "Arts & Culture",
}


def discover_system_prompt():
    return (
        "You are a concise news editor. Given raw web content scraped from news sites, "
        "extract and produce exactly 4 to 6 distinct news articles as a JSON array.\n\n"
        "Each article must be a JSON object with these fields:\n"
        '- "title": string (concise headline, max 100 chars)\n'
        '- "excerpt": string (2-3 sentence summary, max 300 chars)\n'
        '- "sourceUrl": string (the original URL if identifiable, or null)\n'
        '- "sourceTitle": string (the source/publication name if identifiable, or null)\n\n'
        "Rules:\n"
        "- Output ONLY a valid JSON array. No markdown, no explanation, no wrapper.\n"
        "- Each article must be about a different topic/event.\n"
        "- Write in neutral, professional news tone.\n"
        "- If the web content is insufficient, still produce articles based on what is available.\n"
        "- Never fabricate URLs. Use null for sourceUrl if uncertain."
    )


def discover_user_prompt(category: str, web_content: str):
    display_name = CATEGORY_DISPLAY_NAMES.get(category, category.title())
    return (
        f"Category: {display_name}\n\n"
        f"Raw web content from today's {display_name.lower()} news:\n\n"
        f"{web_content[:8000]}\n\n"
        "Produce 4-6 news articles as a JSON array."
    )
