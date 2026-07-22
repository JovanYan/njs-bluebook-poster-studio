#!/usr/bin/env python3
"""Deploy app/dist to the gh-pages branch via the Git Data API, then print the
Pages URL. github.com:443 is unreachable from this machine; api.github.com works."""
import base64
import json
import subprocess
import sys
import urllib.request
import urllib.error
from pathlib import Path

DIST = Path("/Users/zhuofan/Documents/Kimi/Workspaces/NJS Bluebook/app/dist")
OWNER, REPO, BRANCH = "JovanYan", "njs-bluebook-poster-studio", "gh-pages"

token = subprocess.check_output(["gh", "auth", "token"], text=True).strip()
HEADERS = {
    "Authorization": f"Bearer {token}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
}
API = f"https://api.github.com/repos/{OWNER}/{REPO}"


def req(method, url, payload=None, ok=(200, 201), retries=4):
    data = json.dumps(payload).encode() if payload is not None else None
    last = None
    for attempt in range(retries):
        try:
            r = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
            with urllib.request.urlopen(r, timeout=60) as resp:
                return json.loads(resp.read() or b"{}")
        except urllib.error.HTTPError as e:
            body = e.read().decode()[:300]
            print(f"HTTP {e.code} on {method} {url}: {body}")
            raise
        except Exception as e:  # network flake: retry with backoff
            last = e
            import time
            time.sleep(2 * (attempt + 1))
    raise last


def main():
    import hashlib
    files = [p.relative_to(DIST) for p in sorted(DIST.rglob("*")) if p.is_file()]
    print(f"{len(files)} dist files")

    existing_sha = None
    existing_shas = {}
    try:
        ref = req("GET", f"{API}/git/ref/heads/{BRANCH}")
        existing_sha = ref["object"]["sha"]
        commit0 = req("GET", f"{API}/git/commits/{existing_sha}")
        tree0 = req("GET", f"{API}/git/trees/{commit0['tree']['sha']}?recursive=1")
        for item in tree0.get("tree", []):
            if item.get("type") == "blob":
                existing_shas[item["path"]] = item["sha"]
    except Exception:
        pass

    entries, uploaded, reused = [], 0, 0
    for rel in files:
        raw = (DIST / rel).read_bytes()
        sha = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
        if existing_shas.get(str(rel)) == sha:
            reused += 1
        else:
            try:
                blob = req("POST", f"{API}/git/blobs", {"content": raw.decode("utf-8"), "encoding": "utf-8"})
            except UnicodeDecodeError:
                blob = req("POST", f"{API}/git/blobs", {"content": base64.b64encode(raw).decode(), "encoding": "base64"})
            sha = blob["sha"]
            uploaded += 1
        entries.append({"path": str(rel), "mode": "100644", "type": "blob", "sha": sha})
    print(f"uploaded {uploaded}, reused {reused}")

    tree_payload = {"tree": entries}  # full replace, no base_tree: dist is generated
    tree = req("POST", f"{API}/git/trees", tree_payload)
    commit = req("POST", f"{API}/git/commits", {
        "message": "Deploy: GitHub Pages build",
        "tree": tree["sha"],
        "parents": [existing_sha] if existing_sha else [],
    })
    if existing_sha:
        req("PATCH", f"{API}/git/refs/heads/{BRANCH}", {"sha": commit["sha"], "force": True})
    else:
        req("POST", f"{API}/git/refs", {"ref": f"refs/heads/{BRANCH}", "sha": commit["sha"]})
    print("gh-pages updated:", commit["sha"][:10])

    # enable / refresh Pages
    try:
        pages = req("POST", f"{API}/pages", {"source": {"branch": BRANCH, "path": "/"}}, ok=(201, 409))
        print("Pages enabled:", pages.get("html_url", ""))
    except urllib.error.HTTPError as e:
        if e.code == 409:
            pages = req("GET", f"{API}/pages")
            print("Pages already configured:", pages.get("html_url", ""))
        elif e.code == 403:
            print("PAGES_403: private repo Pages requires a paid plan — see report")
        else:
            raise

    print(f"URL: https://{OWNER.lower()}.github.io/{REPO}/")


if __name__ == "__main__":
    sys.exit(main())
