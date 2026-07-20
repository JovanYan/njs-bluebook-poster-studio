#!/usr/bin/env python3
"""Push the workspace to GitHub via the Git Data API (api.github.com).

Used because github.com:443 (git protocol endpoint) is unreachable from this
machine while api.github.com works. Creates blobs -> tree -> commit -> ref.
"""
import base64
import json
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path("/Users/zhuofan/Documents/Kimi/Workspaces/NJS Bluebook")
OWNER, REPO, BRANCH = "JovanYan", "njs-bluebook-poster-studio", "main"
IGNORE_DIRS = {"node_modules", "dist", ".git", "__pycache__"}
IGNORE_SUFFIX = {".log", ".DS_Store"}

token = subprocess.check_output(["gh", "auth", "token"], text=True).strip()
HEADERS = {
    "Authorization": f"Bearer {token}",
    "Accept": "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "Content-Type": "application/json",
}
API = f"https://api.github.com/repos/{OWNER}/{REPO}"


def req(method, url, payload=None):
    data = json.dumps(payload).encode() if payload is not None else None
    r = urllib.request.Request(url, data=data, headers=HEADERS, method=method)
    with urllib.request.urlopen(r, timeout=60) as resp:
        return json.loads(resp.read() or b"{}")


def collect_files():
    files = []
    for p in sorted(ROOT.rglob("*")):
        if not p.is_file():
            continue
        rel = p.relative_to(ROOT)
        if any(part in IGNORE_DIRS for part in rel.parts):
            continue
        if p.name in IGNORE_SUFFIX or p.suffix in IGNORE_SUFFIX:
            continue
        files.append(rel)
    return files


def main():
    files = collect_files()
    print(f"{len(files)} files to push")

    # check existing ref (repo may already have commits)
    existing_sha = None
    try:
        ref = req("GET", f"{API}/git/ref/heads/{BRANCH}")
        existing_sha = ref["object"]["sha"]
        print("existing branch found, will add commit on top")
    except Exception:
        print("empty repo, creating first commit")

    entries = []
    for i, rel in enumerate(files, 1):
        raw = (ROOT / rel).read_bytes()
        try:
            content = raw.decode("utf-8")
            blob = req("POST", f"{API}/git/blobs", {"content": content, "encoding": "utf-8"})
        except UnicodeDecodeError:
            b64 = base64.b64encode(raw).decode()
            blob = req("POST", f"{API}/git/blobs", {"content": b64, "encoding": "base64"})
        entries.append({"path": str(rel), "mode": "100644", "type": "blob", "sha": blob["sha"]})
        if i % 10 == 0 or i == len(files):
            print(f"  blobs: {i}/{len(files)}")

    tree_payload = {"tree": entries}
    if existing_sha:
        commit = req("GET", f"{API}/git/commits/{existing_sha}")
        tree_payload["base_tree"] = commit["tree"]["sha"]
    tree = req("POST", f"{API}/git/trees", tree_payload)

    commit_payload = {
        "message": "NJS Bluebook Poster Studio: halftone poster generator + design rules + asset scripts",
        "tree": tree["sha"],
        "parents": [existing_sha] if existing_sha else [],
    }
    new_commit = req("POST", f"{API}/git/commits", commit_payload)

    if existing_sha:
        req("PATCH", f"{API}/git/refs/heads/{BRANCH}", {"sha": new_commit["sha"], "force": False})
    else:
        req("POST", f"{API}/git/refs", {"ref": f"refs/heads/{BRANCH}", "sha": new_commit["sha"]})
    print("PUSHED:", new_commit["sha"][:10], f"https://github.com/{OWNER}/{REPO}")


if __name__ == "__main__":
    sys.exit(main())
