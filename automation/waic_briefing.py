#!/usr/bin/env python3
"""Generate the Shanghai AI Conference / WAIC public-web briefing for GitHub Pages.

This script intentionally uses Python's standard library only so GitHub Actions can
run it without installing dependencies. It reads public RSS/search feeds, extracts
short metadata and links, then writes data/waic-briefing.json for the static site.
"""
from __future__ import annotations

import email.utils
import html
import json
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import defaultdict
from dataclasses import dataclass, asdict
from datetime import datetime, timezone, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "data" / "waic-briefing.json"
USER_AGENT = "Mozilla/5.0 (compatible; DEEPTECH-WAIC-Briefing/1.0; +https://edwardchina2023-max.github.io/edward-club/)"
TZ = timezone(timedelta(hours=8))

QUERIES = [
    "上海人工智能大会 论坛 直播",
    "世界人工智能大会 WAIC 最新 论坛",
    "WAIC 上海 AI 大会 观点 科技",
    "WAIC 直播 世界人工智能大会",
    "site:mp.weixin.qq.com WAIC 世界人工智能大会 观点",
    "site:bilibili.com WAIC 世界人工智能大会",
    "site:36kr.com WAIC 人工智能大会",
    "site:huxiu.com WAIC 人工智能大会",
    "site:jiqizhixin.com WAIC 人工智能大会",
    "WAIC 逛展 直播",
    "世界人工智能大会 逛展 探馆 直播",
    "WAIC 嘉宾 解读 直播",
    "上海人工智能大会 嘉宾解读 直播",
]

STATIC_SOURCES = [
    {"name": "WAIC / 世界人工智能大会官方网站", "url": "https://www.worldaic.com.cn/"},
]

@dataclass
class Item:
    title: str
    url: str
    source: str
    published_at: str
    type: str
    summary: str
    image: str = ""


def request(url: str, timeout: int = 12) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.6"})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return response.read()


def strip_markup(value: str) -> str:
    value = re.sub(r"<[^>]+>", " ", value or "")
    value = html.unescape(value)
    value = re.sub(r"\s+", " ", value).strip()
    return value


def parse_date(value: str) -> datetime:
    if not value:
        return datetime.now(TZ)
    try:
        dt = email.utils.parsedate_to_datetime(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(TZ)
    except Exception:
        return datetime.now(TZ)


def public_news_rss(query: str) -> str:
    # Google News RSS is currently the most reliable no-key public news feed for
    # GitHub Actions. The page still links back to original publishers.
    params = urllib.parse.urlencode({"q": query, "hl": "zh-CN", "gl": "CN", "ceid": "CN:zh-Hans"})
    return f"https://news.google.com/rss/search?{params}"


def extract_source(item: ET.Element, link: str) -> str:
    source = item.findtext("source")
    if source:
        return strip_markup(source)
    try:
        return urllib.parse.urlparse(link).hostname.replace("www.", "")
    except Exception:
        return "公开网络"


def classify(title: str, url: str, summary: str) -> str:
    blob = f"{title} {url} {summary}".lower()
    if any(word in blob for word in ["直播", "live", "回放", "视频号"]):
        return "直播"
    if any(word in blob for word in ["mp.weixin.qq.com", "bilibili.com", "zhihu.com", "小红书", "大v", "创作者"]):
        return "观点"
    if any(word in blob for word in ["论坛", "圆桌", "峰会", "议程", "开幕", "主论坛"]):
        return "论坛"
    if any(word in blob for word in ["worldaic", "waic", "世界人工智能大会", "上海人工智能大会"]):
        return "媒体"
    return "媒体"


def fetch_og_image(url: str) -> str:
    try:
        data = request(url, timeout=8)[:280_000].decode("utf-8", errors="ignore")
    except Exception:
        return ""
    patterns = [
        r'<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)',
        r'<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']',
        r'<meta[^>]+name=["\']twitter:image["\'][^>]+content=["\']([^"\']+)',
    ]
    for pattern in patterns:
        match = re.search(pattern, data, re.I)
        if match:
            image = html.unescape(match.group(1)).strip()
            return urllib.parse.urljoin(url, image)
    return ""


def parse_rss(url: str) -> list[Item]:
    try:
        data = request(url)
    except urllib.error.URLError as exc:
        print(f"warn: failed to fetch {url}: {exc}", file=sys.stderr)
        return []
    try:
        root = ET.fromstring(data)
    except ET.ParseError as exc:
        print(f"warn: failed to parse RSS {url}: {exc}", file=sys.stderr)
        return []
    items: list[Item] = []
    for node in root.findall(".//item")[:20]:
        title = strip_markup(node.findtext("title", ""))
        link = strip_markup(node.findtext("link", ""))
        if not title or not link:
            continue
        desc = strip_markup(node.findtext("description", ""))
        published = parse_date(node.findtext("pubDate", ""))
        source = extract_source(node, link)
        item_type = classify(title, link, desc)
        items.append(Item(
            title=title,
            url=link,
            source=source,
            published_at=published.isoformat(),
            type=item_type,
            summary=desc[:180] + ("…" if len(desc) > 180 else ""),
        ))
    return items


def dedupe(items: list[Item]) -> list[Item]:
    seen: set[str] = set()
    unique: list[Item] = []
    for item in sorted(items, key=lambda i: i.published_at, reverse=True):
        key = re.sub(r"\W+", "", (item.url or item.title).lower())[:160]
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique


def section_title(kind: str) -> tuple[str, str]:
    return {
        "论坛": ("论坛议题与大会现场", "Forum agenda and conference signals"),
        "直播": ("直播间与回放入口", "Livestream rooms and replays"),
        "观点": ("科技与科普创作者观点", "Creator and KOL viewpoints"),
        "媒体": ("媒体快讯与产业发布", "Media updates and industry announcements"),
    }.get(kind, ("其他公开信号", "Other public signals"))


def zh_time(dt: datetime) -> str:
    return f"{dt.month:02d}月{dt.day:02d}日 {dt.hour:02d}:{dt.minute:02d}"


def public_link_item(title: str, query: str, source: str, summary: str, item_type: str = "观点") -> dict:
    url = "https://www.google.com/search?" + urllib.parse.urlencode({"q": query})
    return asdict(Item(title=title, url=url, source=source, published_at="", type=item_type, summary=summary, image=""))


def search_item(title: str, query: str, source: str, summary: str) -> dict:
    return public_link_item(title, query, source, summary, "观点")


def live_bucket(item: Item) -> str | None:
    blob = f"{item.title} {item.summary} {item.source} {item.url}".lower()
    is_live = any(word in blob for word in ["直播", "回放", "live", "视频", "视频号", "全程放送", "现场直击", "直击"])
    is_forum_signal = any(word in blob for word in ["主论坛", "论坛", "峰会", "会议", "开幕式", "圆桌"])
    if not (is_live or is_forum_signal):
        return None
    if any(word in blob for word in ["逛展", "探馆", "展区", "展台", "展商", "参展", "展览", "看展", "展馆"]):
        return "exhibition"
    if any(word in blob for word in ["嘉宾", "解读", "专访", "访谈", "对话", "专家", "院士", "大咖", "观点", "评论"]):
        return "guest"
    if any(word in blob for word in ["主论坛", "论坛", "峰会", "会议", "开幕式", "议程", "圆桌"]):
        return "forum"
    return "guest"


def dedupe_dict_items(items: list[dict]) -> list[dict]:
    seen: set[str] = set()
    unique: list[dict] = []
    for item in items:
        key = re.sub(r"\W+", "", f"{item.get('source', '')}{item.get('title', '')}".lower())[:180]
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique


def build_live_sections(items: list[Item]) -> list[dict]:
    buckets = {"forum": [], "exhibition": [], "guest": []}
    for item in items:
        bucket = live_bucket(item)
        if bucket:
            buckets[bucket].append(asdict(item))
    buckets = {key: dedupe_dict_items(value) for key, value in buckets.items()}

    fallbacks = {
        "forum": [
            public_link_item("论坛直播检索：WAIC 主论坛 / 分论坛 / 圆桌", "WAIC 2026 主论坛 分论坛 直播 回放", "Google Search", "用于补充自动新闻源未收录的论坛直播间、官方回放和媒体直播入口。", "直播"),
            public_link_item("官方大会直播入口检索", "世界人工智能大会 官方 直播 入口", "Google Search", "优先核验官方直播、主论坛和高等级会议直播链接。", "直播"),
        ],
        "exhibition": [
            public_link_item("逛展直播检索：WAIC 展区 / 探馆 / 展台", "WAIC 逛展 探馆 展区 直播", "Google Search", "用于寻找媒体、展商和创作者的现场逛展直播与回放。", "直播"),
            public_link_item("B站逛展视频检索", "site:bilibili.com WAIC 逛展 探馆 直播", "Google Search", "补充视频平台上的展区走访、探馆和现场体验内容。", "直播"),
        ],
        "guest": [
            public_link_item("嘉宾解读直播检索：专家 / 院士 / 企业家观点", "WAIC 嘉宾 解读 直播 专家 观点", "Google Search", "用于补充大会嘉宾、专家学者、企业负责人和科技创作者的解读直播。", "直播"),
            public_link_item("公众号嘉宾解读检索", "site:mp.weixin.qq.com WAIC 嘉宾 解读 直播", "Google Search", "补充公众号文章和直播预告中的嘉宾解读入口。", "直播"),
        ],
    }
    for key, fallback_items in fallbacks.items():
        if not buckets[key]:
            buckets[key] = fallback_items

    return [
        {"id": "forum", "title": "论坛视频直播", "en": "Forum Livestreams", "description": "主论坛、分论坛、圆桌、开幕式与高级别会议的直播/回放入口。", "items": buckets["forum"][:30]},
        {"id": "exhibition", "title": "逛展直播", "en": "Expo Walkthroughs", "description": "展区、展台、探馆、现场走访和新品展示类直播/回放入口。", "items": buckets["exhibition"][:30]},
        {"id": "guest", "title": "嘉宾解读直播", "en": "Guest Commentary", "description": "大会嘉宾、专家、企业家、科技媒体和科普创作者的观点解读直播/回放入口。", "items": buckets["guest"][:30]},
    ]


def build_highlights(items: list[Item]) -> list[str]:
    if not items:
        return [
            "自动任务已运行，但暂时没有抓到可解析的新链接；页面将保留上一版或首版简报。",
            "建议补充固定来源清单，例如官方直播页、重点科技媒体 RSS、B 站/视频号账号主页。",
        ]
    highlights: list[str] = []
    buckets = defaultdict(int)
    for item in items:
        buckets[item.type] += 1
    if buckets:
        highlights.append("本轮抓取到 " + "、".join(f"{kind} {count} 条" for kind, count in sorted(buckets.items())) + "，已按企业家阅读场景分组。")
    for item in items[:5]:
        source = item.source or "公开来源"
        highlights.append(f"{source}：{item.title}")
    return highlights[:6]


def main() -> None:
    all_items: list[Item] = []
    sources = STATIC_SOURCES.copy()
    for query in QUERIES:
        rss = public_news_rss(query)
        sources.append({"name": f"Google News RSS：{query}", "url": rss})
        all_items.extend(parse_rss(rss))
        time.sleep(0.7)

    items = dedupe(all_items)
    for item in items[:12]:
        item.image = fetch_og_image(item.url)
        time.sleep(0.35)

    grouped = defaultdict(list)
    for item in items:
        grouped[item.type].append(asdict(item))

    if not grouped.get("观点"):
        grouped["观点"] = [
            search_item("公众号观点检索：WAIC / 世界人工智能大会", "site:mp.weixin.qq.com WAIC 世界人工智能大会 观点", "Google Search", "公开新闻源未抓到稳定公众号结果时，保留可点击检索入口，便于人工快速查看科技与科普作者更新。"),
            search_item("B站观点检索：WAIC 现场与科普解读", "site:bilibili.com WAIC 世界人工智能大会 AI 观点", "Google Search", "用于追踪视频创作者、科技媒体号和大会现场解读内容。"),
            search_item("知乎/专栏观点检索：AI 大会讨论", "WAIC 2026 世界人工智能大会 观点 知乎 科技", "Google Search", "用于补充大会期间的行业讨论、问答与长文观点。"),
        ]

    sections = []
    for kind in ["论坛", "直播", "观点", "媒体"]:
        title, en = section_title(kind)
        sections.append({"id": kind, "title": title, "en": en, "items": grouped.get(kind, [])[:12]})

    now = datetime.now(TZ)
    briefing = {
        "generated_at": now.isoformat(),
        "status": "auto",
        "edition_title": f"上海人工智能大会公开信号追踪 · {zh_time(now)}",
        "summary": "本简报由自动任务从公开搜索源与可访问页面中生成，供企业家快速浏览大会论坛、直播、媒体报道与科技创作者观点。请以原始链接为准做最终核验。",
        "highlights": build_highlights(items),
        "sections": sections,
        "live_sections": build_live_sections(items),
        "sources": sources[:14],
        "query_log": QUERIES,
    }
    OUTPUT.parent.mkdir(exist_ok=True)
    previous = OUTPUT.read_text(encoding="utf-8") if OUTPUT.exists() else ""
    new_text = json.dumps(briefing, ensure_ascii=False, indent=2) + "\n"
    if new_text != previous:
        OUTPUT.write_text(new_text, encoding="utf-8")
        print(f"updated {OUTPUT.relative_to(ROOT)} with {len(items)} items")
    else:
        print("no changes")

if __name__ == "__main__":
    main()
