"""GitHub Releases API adapter.

Fetches release notes from any public GitHub repository.
Ideal for monitoring product updates, changelogs, and version bumps.

Config keys:
    owner: GitHub repository owner (required)
    repo: GitHub repository name (required)
    max_items: max releases to return (default: 10)
    include_prerelease: include pre-releases (default: false)
"""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from info_monitor_worker.adapters.base import BaseAdapter
from info_monitor_worker.http_client import get_http_client
from info_monitor_worker.adapters.time_utils import TZ_CST, now_cst
from info_monitor_worker.models import RawFetchResult, SourceContext, ThemeContext

RELEASES_URL = "https://api.github.com/repos/{owner}/{repo}/releases"


class GithubReleasesAdapter(BaseAdapter):
    def fetch(self, theme: ThemeContext, source: SourceContext) -> RawFetchResult:
        owner = source.config.get("owner")
        repo = source.config.get("repo")
        if not owner or not repo:
            raise ValueError("github_releases adapter requires config.owner and config.repo")

        max_items = int(source.config.get("max_items", 10))
        include_prerelease = bool(source.config.get("include_prerelease", False))

        url = RELEASES_URL.format(owner=owner, repo=repo)
        params = {"per_page": min(max_items * 2, 30)}  # fetch extra to allow filtering

        headers = {
            "Accept": "application/vnd.github+json",
        }

        # Optional GitHub token for rate limits
        token = source.config.get("github_token")
        if token:
            headers["Authorization"] = f"Bearer {token}"

        response = get_http_client().get(url, params=params, headers=headers)
        payload = response.json()

        return RawFetchResult(payload=payload, metadata={
            "owner": owner,
            "repo": repo,
            "max_items": max_items,
            "include_prerelease": include_prerelease,
        })

    def map_to_normalizer_input(self, raw_result: RawFetchResult) -> Any:
        releases = raw_result.payload
        if not isinstance(releases, list):
            raise ValueError("github_releases: expected a list of releases")

        owner = str(raw_result.metadata.get("owner", ""))
        repo = str(raw_result.metadata.get("repo", ""))
        max_items = int(raw_result.metadata.get("max_items", 10))
        include_prerelease = bool(raw_result.metadata.get("include_prerelease", False))
        fallback_at = now_cst()

        items: List[Dict[str, Any]] = []

        for release in releases:
            if not isinstance(release, dict):
                continue

            is_prerelease = bool(release.get("prerelease"))
            if is_prerelease and not include_prerelease:
                continue

            tag = str(release.get("tag_name") or "")
            name = str(release.get("name") or tag)
            body = str(release.get("body") or "")
            published_at = str(release.get("published_at") or "")
            html_url = str(release.get("html_url") or "")

            if not tag and not name:
                continue

            occurred_at = fallback_at
            if published_at:
                # GitHub API returns ISO 8601 with Z suffix
                occurred_at = published_at.replace("Z", "+00:00")

            # Classify the release type from tag/name
            release_type = "release"
            lower_tag = tag.lower()
            if "rc" in lower_tag or "beta" in lower_tag or "alpha" in lower_tag:
                release_type = "pre_release"

            # Extract version number if present
            version = tag.lstrip("v") if tag.startswith("v") else tag

            items.append({
                "object_name": f"{owner}/{repo}",
                "title": f"{repo} {name}",
                "occurred_at": occurred_at,
                "url": html_url,
                "update_type": "feature_release",
                "summary": body[:500] if body else name,
                "version": version,
                "tag": tag,
                "release_type": release_type,
                "is_prerelease": is_prerelease,
            })

            if len(items) >= max_items:
                break

        if not items:
            raise ValueError(f"github_releases: no releases found for {owner}/{repo}")

        return items
