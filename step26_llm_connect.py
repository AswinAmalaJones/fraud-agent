import os
from dotenv import load_dotenv
from google import genai

load_dotenv()
key = os.getenv("GEMINI_API_KEY", "")


def safe(err):
    text = f"{type(err).__name__}: {err}"
    return text.replace(key, "***") if key else text


print("Key  :", f"found ({len(key)} characters)" if key else "MISSING")
print()

if not key:
    raise SystemExit("GEMINI_API_KEY is missing from .env. Fix it and run again.")

try:
    client = genai.Client(api_key=key)
    print("OK    1. client created")
except Exception as e:
    print("FAIL  1. client:", safe(e)[:300])
    raise SystemExit(1)

try:
    resp = client.models.generate_content(
        model="gemini-3.6-flash",
        contents="Reply with exactly one word: OK",
    )
    print("OK    2. model replied:", resp.text.strip())
except Exception as e:
    print("FAIL  2. generate_content:", safe(e)[:400])