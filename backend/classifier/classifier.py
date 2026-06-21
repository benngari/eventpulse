"""
Event Discovery System — Keyword Classifier (No AI API needed)
Categorises events using keyword matching — zero API calls, runs instantly.

Run after fetcher.py:
    python classifier/classifier.py
"""

import os
import re
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

def get_supabase():
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_KEY"]
    )

# ── Keyword rules ─────────────────────────────────────────────
# Order matters — first match wins. Put more specific rules first.

RULES = [
    # ── Vets & Pets ───────────────────────────────────────────
    ("vet", [
        "vet", "veterinary", "veterinarian", "animal clinic",
        "pet", "vaccination", "vaccine", "deworming", "deworm",
        "rabies", "dog", "cat", "puppy", "kitten", "reptile",
        "exotic animal", "bird clinic", "animal health", "paw",
        "kennel", "animal shelter", "spay", "neuter",
    ]),

    # ── Sports ────────────────────────────────────────────────
    ("sports", [
        "match", "tournament", "league", "cup", "championship",
        "marathon", "run", "race", "cycling", "triathlon",
        "football", "soccer", "rugby", "basketball", "volleyball",
        "tennis", "badminton", "swimming", "athletics",
        "gym", "fitness", "workout", "training session",
        "cricket", "hockey", "boxing", "wrestling", "karate",
        "sport", "team", "vs ", " v ", "semifinal", "final",
        "premier league", "champions league", "afcon",
    ]),

    # ── Music ─────────────────────────────────────────────────
    ("music", [
        "concert", "live music", "jazz", "band", "orchestra",
        "dj", "disc jockey", "hip hop", "reggae", "afrobeats",
        "gospel", "choir", "open mic", "talent show",
        "music festival", "album launch", "unplugged",
        "piano", "guitar", "drums", "karaoke", "rnb", "r&b",
        "gig", "performance", "show night", "music night",
        "nightclub", "club night",
    ]),

    # ── Food & Drink ──────────────────────────────────────────
    ("food", [
        "food festival", "food fair", "street food", "tasting",
        "cooking", "baking", "chef", "recipe", "cuisine",
        "restaurant", "brunch", "dinner", "supper", "lunch",
        "bbq", "braai", "wine tasting", "beer festival",
        "cocktail", "coffee", "cafe event", "pop-up",
        "vegan", "vegetarian", "organic food", "farm",
    ]),

    # ── Health ────────────────────────────────────────────────
    ("health", [
        "health", "medical", "hospital", "clinic", "screening",
        "blood pressure", "blood sugar", "diabetes", "hiv",
        "cancer", "check-up", "checkup", "wellness",
        "mental health", "therapy", "counselling", "counseling",
        "yoga", "meditation", "mindfulness", "nutrition",
        "doctor", "nurse", "pharmacy", "first aid",
        "eye test", "dental", "reproductive health",
    ]),

    # ── Education ─────────────────────────────────────────────
    ("education", [
        "workshop", "seminar", "webinar", "bootcamp", "training",
        "class", "lesson", "course", "lecture", "talk",
        "conference", "summit", "symposium", "forum",
        "school", "university", "college", "academy",
        "coding", "programming", "tech", "stem", "science",
        "scholarship", "career", "internship", "job fair",
        "hackathon", "debate",
    ]),

    # ── Community ─────────────────────────────────────────────
    ("community", [
        "community", "neighbourhood", "neighborhood", "clean-up",
        "cleanup", "volunteer", "charity", "fundraising",
        "church", "mosque", "temple", "prayer", "worship",
        "social", "networking", "meetup", "meet up",
        "mentorship", "mentor", "youth", "women", "empowerment",
        "awareness", "campaign", "rally", "march",
        "market day", "flea market", "exhibition",
    ]),
]

# ── Tag rules ─────────────────────────────────────────────────
# Applied after category — add descriptive tags based on keywords

TAG_RULES = {
    "free":        ["free", "no charge", "complimentary", "gratis"],
    "online":      ["online", "virtual", "zoom", "google meet", "webinar", "livestream", "live stream"],
    "outdoor":     ["outdoor", "park", "garden", "grounds", "field", "stadium", "street"],
    "family":      ["family", "children", "kids", "child", "all ages"],
    "live-music":  ["live music", "live band", "live performance"],
    "ticketed":    ["ticket", "tickets", "entry fee", "admission", "register"],
    "food":        ["food", "eat", "drink", "cuisine", "meal"],
    "sport":       ["sport", "match", "tournament", "league"],
    "health":      ["health", "medical", "wellness", "screening"],
    "networking":  ["network", "networking", "connect", "meetup"],
    "nairobi":     ["nairobi", "nbi", "cbd", "westlands", "karen", "kilimani", "eastleigh", "langata"],
    "mombasa":     ["mombasa", "msa", "coastal"],
}


# ── Core classifier ───────────────────────────────────────────

def classify(title: str, description: str = "") -> dict:
    """
    Returns { category, tags, is_free, summary }.
    Uses only keyword matching — no API calls needed.
    """
    combined = f"{title} {description or ''}".lower()
    combined = re.sub(r"[^\w\s]", " ", combined)  # strip punctuation

    # Category
    category = "other"
    for slug, keywords in RULES:
        if any(kw in combined for kw in keywords):
            category = slug
            break

    # Tags
    tags = []
    for tag, keywords in TAG_RULES.items():
        if any(kw in combined for kw in keywords):
            tags.append(tag)

    # Free detection
    is_free = "free" in tags or any(
        kw in combined for kw in ["free entry", "free admission", "no charge", "complimentary"]
    )

    # Simple summary (title + category label)
    cat_labels = {
        "sports": "Sports event", "vet": "Vet & pet event",
        "music": "Music event", "food": "Food event",
        "community": "Community event", "health": "Health event",
        "education": "Education event", "other": "Event",
    }
    summary = f"{cat_labels[category]}: {title}."

    return {
        "category": category,
        "tags":     tags,
        "is_free":  is_free,
        "summary":  summary,
    }


# ── Process all unclassified events in Supabase ───────────────

def classify_pending(batch_size: int = 100):
    print("=== Keyword Classifier ===\n")
    supabase = get_supabase()

    res = (
        supabase.table("events")
        .select("id, title, description")
        .eq("category_slug", "other")
        .limit(batch_size)
        .execute()
    )

    events = res.data
    if not events:
        print("No unclassified events — all up to date!")
        return

    print(f"Classifying {len(events)} events...\n")
    counts = {}

    for ev in events:
        result = classify(ev["title"], ev.get("description", ""))

        supabase.table("events").update({
            "category_slug": result["category"],
            "tags":          result["tags"],
            "is_free":       result["is_free"],
            "ai_summary":    result["summary"],
        }).eq("id", ev["id"]).execute()

        counts[result["category"]] = counts.get(result["category"], 0) + 1
        print(f"  [{result['category']:12}] {ev['title'][:65]}")

    print(f"\n✅ Done. Breakdown:")
    for cat, n in sorted(counts.items(), key=lambda x: -x[1]):
        print(f"   {cat:12} {n} events")


# ── CLI test — run without Supabase ──────────────────────────

def demo():
    tests = [
        ("Nairobi Marathon 2026", ""),
        ("Free Pet Vaccination Drive", "Dogs and cats welcome"),
        ("Jazz Night at The Alchemist", "Live afrobeats and jazz"),
        ("Vegan Cooking Workshop", "Plant-based recipes"),
        ("Blood Pressure Screening", "Free walk-in health check"),
        ("Youth Mentorship Forum", "Online via Zoom"),
        ("Tech Skills Bootcamp", "Coding and AI basics"),
        ("Arsenal vs Chelsea", "Premier League live stream"),
        ("Street Food Festival", "Free entry, Nairobi CBD"),
    ]
    print("=== Demo (no Supabase needed) ===\n")
    for title, desc in tests:
        r = classify(title, desc)
        print(f"  {title}")
        print(f"    → category: {r['category']}  |  free: {r['is_free']}  |  tags: {r['tags']}")
        print()


if __name__ == "__main__":
    import sys
    if "--demo" in sys.argv or not os.getenv("SUPABASE_URL"):
        demo()
    else:
        classify_pending(batch_size=100)
