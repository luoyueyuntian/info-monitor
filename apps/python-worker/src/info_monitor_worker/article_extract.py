"""Bounded original-text extraction. Invoked in a disposable subprocess, never a DB transaction."""
from __future__ import annotations

import json
import re
import ipaddress
import socket
import sys
import time
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup, NavigableString, Comment

MAX_TEXT = 1_000_000


def public_target(url: str) -> tuple[httpx.URL, str, str]:
    parsed = httpx.URL(url)
    if parsed.scheme not in ('http', 'https') or not parsed.host or parsed.userinfo or parsed.port not in (None, 80, 443):
        raise ValueError('原文链接必须为公开的 HTTP/HTTPS 地址')
    addresses = socket.getaddrinfo(parsed.host, parsed.port or (443 if parsed.scheme == 'https' else 80), type=socket.SOCK_STREAM)
    ips = [ipaddress.ip_address(item[4][0]) for item in addresses]
    if not ips or any(not ip.is_global for ip in ips):
        raise ValueError('不允许访问内部网络地址')
    # Pin the connection to this validated IP: Host and TLS verification retain the original hostname.
    host = parsed.netloc.decode('ascii')
    return parsed.copy_with(host=str(ips[0]), fragment=None), host, parsed.host


def _checked(text: str, title: str = '') -> dict:
    text = text.replace('\x00', '').strip()
    if len(text) < 80:
        raise ValueError('未找到可阅读正文，可能需要登录或页面未提供正文')
    if len(text) > MAX_TEXT:
        raise ValueError('原文过长，请打开原始来源阅读')
    if len(text) < 3000 and any(word in text.lower() for word in ('verify you are human', 'access denied', '人机验证', '安全验证', 'just a moment')):
        raise ValueError('来源要求访问验证，请打开原始来源阅读')
    return {'text': text, 'title': title.strip()[:1000], 'contentType': 'html'}


def extract_html(html: str) -> dict:
    soup = BeautifulSoup(html, 'html.parser')
    title_node = soup.find('title') or soup.find('h1')
    og_title = soup.find('meta', property='og:title')
    title = str(og_title.get('content', '')) if og_title else title_node.get_text(' ', strip=True) if title_node else ''
    structured = []
    paywalled = False
    for script in soup.select('script[type="application/ld+json"]'):
        try:
            def visit(value):
                nonlocal paywalled
                if isinstance(value, dict):
                    if value.get('isAccessibleForFree') in (False, 'false'):
                        paywalled = True
                    body = value.get('articleBody')
                    if isinstance(body, str):
                        structured.append(body)
                    for item in value.values():
                        if isinstance(item, (list, dict)):
                            visit(item)
                elif isinstance(value, list):
                    for item in value:
                        visit(item)
            visit(json.loads(script.get_text()))
        except (ValueError, RecursionError):
            pass
    # Remove inactive subscription templates before checking visible continuation gates.
    for node in soup.select('[hidden],[aria-hidden="true"]'):
        node.decompose()
    for node in soup.select('[style]'):
        if node.attrs is not None and re.search(r'(?:^|;)\s*(?:display\s*:\s*none|visibility\s*:\s*hidden)\s*(?:!important)?\s*(?:;|$)', str(node.get('style', '')), re.I):
            node.decompose()
    for node in soup.select('script,style,nav,header,footer,aside,form,noscript,iframe,button'):
        node.decompose()
    visible = soup.get_text(' ', strip=True).lower()
    gates = ('subscribe to continue reading', 'subscribe to read the full', 'sign in to continue reading',
             'log in to read the full', '订阅后阅读', '订阅阅读全文', '登录后阅读', '登录阅读全文', '购买后阅读', '注册后阅读')
    if paywalled or any(marker in visible for marker in gates):
        raise ValueError('来源要求订阅或登录，请打开原始网页阅读')
    def body_text(node):
        parts = []
        blocks = {'p','h1','h2','h3','h4','li','blockquote','pre','tr','div','section','br'}
        def walk(item):
            if isinstance(item, Comment):
                return
            if isinstance(item, NavigableString):
                parts.append(re.sub(r'\s+', ' ', str(item)))
                return
            if item.name in blocks:
                parts.append('\n\n')
            for child in item.children:
                walk(child)
            if item.name in blocks:
                parts.append('\n\n')
        walk(node)
        value = re.sub(r'[ \t]*\n[ \t]*', '\n', ''.join(parts))
        return re.sub(r'\n{3,}', '\n\n', value).strip()
    selectors = ['article', '[itemprop="articleBody"]', '.TRS_Editor', '#zoom', '.article-content', '.article_content', '.news-content', '#articleContent', '.content-detail', '.markdown-body']
    def candidate(node):
        value = body_text(node)
        linked = sum(len(a.get_text(' ', strip=True)) for a in node.find_all('a'))
        return value if len(value) >= 80 and linked < len(value) * 0.35 else ''
    candidates = [value for selector in selectors for n in soup.select(selector) if (value := candidate(n))]
    if not candidates:
        candidates = [value for n in soup.select('main, [role="main"]') if (value := candidate(n))]
    if not candidates:
        # Conservative fallback: prefer substantial prose over link directories.
        for node in soup.select('div,body'):
            paragraphs = node.find_all('p')
            prose = '\n\n'.join(p.get_text(' ', strip=True) for p in paragraphs)
            linked = sum(len(a.get_text()) for a in node.find_all('a'))
            if len(prose) >= 160 and linked < len(prose) * 0.35:
                candidates.append(prose)
    candidates += structured
    return _checked(max(candidates, key=len, default=''), title)


def fetch_document(url: str, *, transport=None, max_bytes: int = 5_000_000) -> dict:
    deadline = time.monotonic() + 60
    for _ in range(5):
        target, host, tls = public_target(url)
        if time.monotonic() > deadline:
            raise ValueError('原文下载超时，请稍后重试')
        # No environment proxies: proxy-side DNS would defeat validation/pinning.
        with httpx.Client(timeout=15, trust_env=False, transport=transport) as client:
            with client.stream('GET', target, headers={'Host': host, 'User-Agent': 'Mozilla/5.0 (compatible; InfoMonitor/1.0)', 'Accept': 'text/html'}, extensions={'sni_hostname': tls}) as response:
                if response.status_code in (301, 302, 303, 307, 308):
                    location = response.headers.get('location')
                    if not location:
                        raise ValueError('来源重定向缺少目标地址')
                    url = urljoin(url, location)
                    time.sleep(0.5)
                    continue
                response.raise_for_status()
                chunks, size = [], 0
                for chunk in response.iter_bytes():
                    size += len(chunk)
                    if size > max_bytes:
                        raise ValueError('原文文件过大，请打开原始来源阅读')
                    if time.monotonic() > deadline:
                        raise ValueError('原文下载超时，请稍后重试')
                    chunks.append(chunk)
                data = b''.join(chunks)
                content_type = response.headers.get('content-type', '').lower()
                if 'application/pdf' in content_type or data.startswith(b'%PDF-'):
                    raise ValueError('PDF 公告暂不支持站内阅读，请打开原始文件')
                elif 'html' in content_type or data.lstrip().lower().startswith((b'<!doctype html', b'<html', b'<meta', b'<article')):
                    # Honor HTML charset when the server omits a charset header (common official sites).
                    encoding = response.encoding
                    if 'charset=' not in content_type:
                        head = BeautifulSoup(data[:8192], 'html.parser')
                        meta = head.find('meta', charset=True)
                        encoding = meta.get('charset') if meta else BeautifulSoup(data, 'html.parser').original_encoding or encoding
                    if encoding and encoding.lower() in ('gb2312', 'gbk'):
                        encoding = 'gb18030'
                    try:
                        html = data.decode(encoding or 'utf-8', errors='replace')
                    except LookupError:
                        html = data.decode('utf-8', errors='replace')
                    result = extract_html(html)
                else:
                    raise ValueError('来源未返回可阅读的网页')
                result['finalUrl'] = url
                return result
    raise ValueError('来源重定向次数过多')


def main():
    import resource
    resource.setrlimit(resource.RLIMIT_CPU, (15, 15))
    if sys.platform.startswith('linux'):
        resource.setrlimit(resource.RLIMIT_AS, (768 * 1024 * 1024, 768 * 1024 * 1024))
    try:
        print(json.dumps(fetch_document(sys.argv[1]), ensure_ascii=False))
    except Exception as error:
        # Do not return network diagnostics/internal addresses to the browser.
        message = str(error) if isinstance(error, ValueError) else '原文获取失败，来源可能暂时不可用或限制访问'
        print(json.dumps({'error': message}, ensure_ascii=False))
        sys.exit(1)


if __name__ == '__main__':
    main()
