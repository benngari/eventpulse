"""
Event Discovery System — Event Fetcher
Pulls events from multiple free sources and saves to Supabase.

Install:
    pip install supabase requests beautifulsoup4 python-dotenv

Run manually:
    python fetcher.py

Or schedule via GitHub Actions cron (see .github/workflows/fetch.yml)
"""

import os
import hashlib
import requests
from datetime import datetime, date
from bs4 import BeautifulSoup
from supabase import create_client
from dotenv import load_dotenv

load_dotenv()

# ── Supabase client ───────────────────────────────────────────
supabase = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"]   # service key for backend writes
)

TODAY = date.today().isoformat()
CITY  = "Nairobi"


# ── Helpers ───────────────────────────────────────────────────

def make_source_id(*parts):
    """Stable hash so we never insert the same event twice."""
    raw = "|".join(str(p) for p in parts)
    return hashlib.md5(raw.encode()).hexdigest()


def upsert_event(event: dict):
    """Insert or ignore if (source, source_id) already exists."""
    try:
        supabase.table("events").upsert(
            event,
            on_conflict="source,source_id",
            ignore_duplicates=True
        ).execute()
        print(f"  ✓ {event['title'][:60]}")
    except Exception as e:
        print(f"  ✗ Failed: {e}")


def get_or_create_venue(name: str, address: str = None, city: str = CITY) -> int | None:
    """Return venue id, creating it if needed."""
    res = supabase.table("venues").select("id").eq("name", name).execute()
    if res.data:
        return res.data[0]["id"]
    ins = supabase.table("venues").insert({
        "name": name, "address": address, "city": city
    }).execute()
    return ins.data[0]["id"] if ins.data else None


# ── Source 1: Eventbrite (free public API) ────────────────────

def fetch_eventbrite():
    """
    Eventbrite public search — no API key required for public events.
    Docs: https://www.eventbrite.com/platform/api
    """
    print("\n[Eventbrite]")
    url = "https://www.eventbriteapi.com/v3/events/search/"
    params = {
        "location.address":     CITY,
        "location.within":      "20km",
        "start_date.keyword":   "today",
        "expand":               "venue,ticket_availability",
        "token":                os.getenv("EVENTBRITE_TOKEN", ""),  # optional
    }

    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        data = r.json()
    except Exception as e:
        print(f"  Eventbrite error: {e}")
        return

    for ev in data.get("events", []):
        venue    = ev.get("venue", {})
        venue_id = get_or_create_venue(
            venue.get("name", "Unknown Venue"),
            venue.get("address", {}).get("localized_address_display")
        ) if venue else None

        is_free  = ev.get("is_free", False)
        price_info = ev.get("ticket_availability", {})

        upsert_event({
            "title":        ev["name"]["text"],
            "description":  ev.get("description", {}).get("text", ""),
            "starts_at":    ev["start"]["utc"],
            "ends_at":      ev["end"]["utc"],
            "is_free":      is_free,
            "ticket_url":   ev.get("url"),
            "image_url":    (ev.get("logo") or {}).get("url"),
            "venue_id":     venue_id,
            "source":       "eventbrite",
            "source_id":    ev["id"],
            "source_url":   ev.get("url"),
            "category_slug": "other",   # AI classifier will update this
        })


# ── Source 2: Google Places nearby search ────────────────────

def fetch_google_places():
    """
    Google Places — free up to 28,500 calls/month.
    Get a key at: console.cloud.google.com
    """
    print("\n[Google Places]")
    api_key = os.getenv("GOOGLE_PLACES_KEY")
    if not api_key:
        print("  Skipping — GOOGLE_PLACES_KEY not set")
        return

    # Nairobi city centre coords
    lat, lng = -1.2921, 36.8219
    radius   = 20000  # metres

    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{lat},{lng}",
        "radius":   radius,
        "keyword":  "event today",
        "key":      api_key,
    }

    try:
        r = requests.get(url, params=params, timeout=10)
        data = r.json()
    except Exception as e:
        print(f"  Google Places error: {e}")
        return

    for place in data.get("results", []):
        venue_id = get_or_create_venue(
            place["name"],
            place.get("vicinity"),
        )
        upsert_event({
            "title":        f"Event at {place['name']}",
            "starts_at":    f"{TODAY}T09:00:00+03:00",
            "is_free":      False,
            "venue_id":     venue_id,
            "source":       "google_places",
            "source_id":    place["place_id"],
            "source_url":   f"https://maps.google.com/?place_id={place['place_id']}",
            "category_slug": "other",
        })


# ── Source 3: Web scraping — local listings ───────────────────

def fetch_scraped_nairobi():
    """
    Scrape local Nairobi event listing sites.
    Extend this list with any local site that shows today's events.
    """
    print("\n[Web scraping]")

    # nairobi.eventful.com style sites — adapt selectors to the real site
    sources = [
        {
            "url":           "https://allevents.in/nairobi",
            "event_sel":     ".event-item",
            "title_sel":     ".event-name",
            "time_sel":      ".event-time",
            "venue_sel":     ".event-venue",
            "source_name":   "allevents_nairobi",
        },
    ]

    for src in sources:
        try:
            headers = {"User-Agent": "Mozilla/5.0 (compatible; EventBot/1.0)"}
            r = requests.get(src["url"], headers=headers, timeout=15)
            soup = BeautifulSoup(r.text, "html.parser")

            for item in soup.select(src["event_sel"])[:20]:
                title_el = item.select_one(src["title_sel"])
                time_el  = item.select_one(src["time_sel"])
                venue_el = item.select_one(src["venue_sel"])

                if not title_el:
                    continue

                title    = title_el.get_text(strip=True)
                time_str = time_el.get_text(strip=True) if time_el else "12:00"
                venue    = venue_el.get_text(strip=True) if venue_el else "Nairobi"

                venue_id = get_or_create_venue(venue)
                sid      = make_source_id(src["source_name"], title, TODAY)

                upsert_event({
                    "title":        title,
                    "starts_at":    f"{TODAY}T{parse_time(time_str)}+03:00",
                    "venue_id":     venue_id,
                    "source":       src["source_name"],
                    "source_id":    sid,
                    "source_url":   src["url"],
                    "category_slug": "other",
                })

        except Exception as e:
            print(f"  Scrape error ({src['url']}): {e}")


def parse_time(raw: str) -> str:
    """Try to parse '7:30 PM' → '19:30:00'. Falls back to noon."""
    for fmt in ("%I:%M %p", "%H:%M", "%I %p"):
        try:
            return datetime.strptime(raw.strip(), fmt).strftime("%H:%M:%S")
        except ValueError:
            continue
    return "12:00:00"


# ── Source 4: Vet / Pet clinic announcements ──────────────────

def fetch_vet_events():
    """
    Hardcoded Nairobi vet clinic event checker.
    In production: scrape each clinic's Facebook page or website.
    """
    print("\n[Vet clinics]")

    # Extend this list with real clinic URLs
    clinics = [
        {"name": "Karen Veterinary Clinic",  "url": "https://karenvets.co.ke"},
        {"name": "The Animal Health Centre",  "url": "https://animalhealthcentre.co.ke"},
        {"name": "Nairobi Veterinary Clinic", "url": "https://nairobivets.co.ke"},
    ]

    for clinic in clinics:
        try:
            r = requests.get(clinic["url"], timeout=10,
                             headers={"User-Agent": "Mozilla/5.0"})
            soup = BeautifulSoup(r.text, "html.parser")

            # Look for keywords that signal an event or clinic day
            text = soup.get_text().lower()
            keywords = ["vaccination", "clinic day", "free checkup",
                        "open day", "pet health", "deworming"]

            if any(k in text for k in keywords):
                venue_id = get_or_create_venue(clinic["name"])
                sid      = make_source_id("vet", clinic["name"], TODAY)
                upsert_event({
                    "title":        f"Clinic day at {clinic['name']}",
                    "starts_at":    f"{TODAY}T09:00:00+03:00",
                    "ends_at":      f"{TODAY}T17:00:00+03:00",
                    "is_free":      True,
                    "venue_id":     venue_id,
                    "source":       "vet_scrape",
                    "source_id":    sid,
                    "source_url":   clinic["url"],
                    "category_slug": "vet",
                })
        except Exception:
            pass   # Silently skip — not all sites will be reachable


# ── Main ──────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"=== Event fetch run: {datetime.now().strftime('%Y-%m-%d %H:%M')} ===")
    fetch_eventbrite()
    fetch_google_places()
    fetch_scraped_nairobi()
    fetch_vet_events()
    print("\n✅ Fetch complete.")
