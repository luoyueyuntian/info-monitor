import json
import socket

import httpx
import pytest

from info_monitor_worker.article_extract import extract_html, fetch_document, public_target

TEXT = '这是新闻原文的第一段，包含完整的事件背景和详细说明。' * 8


def test_extract_article_excludes_navigation_scripts_and_preserves_paragraphs():
    result = extract_html(f'<html><title>原文标题</title><nav>导航菜单</nav><article><h1>原文标题</h1><p>{TEXT}</p><p>第二段原始正文。</p><script>alert(1)</script></article><footer>广告</footer></html>')
    assert TEXT in result['text']
    assert '\n\n第二段原始正文。' in result['text']
    assert '导航菜单' not in result['text']
    assert 'alert(1)' not in result['text']
    assert result['title'] == '原文标题'


def test_extract_official_editor_and_jsonld():
    assert TEXT in extract_html(f'<div class="TRS_Editor"><p>{TEXT}</p></div>')['text']
    assert TEXT in extract_html('<script type="application/ld+json">' + json.dumps({'@type': 'NewsArticle', 'articleBody': TEXT}) + '</script>')['text']


@pytest.mark.parametrize('html', ['<nav>只有目录和摘要</nav>', '<main>Verify you are human captcha</main>'])
def test_rejects_missing_body_or_block_page(html):
    with pytest.raises(ValueError):
        extract_html(html)


@pytest.mark.parametrize('url', ['file:///etc/passwd', 'http://user:pass@example.com', 'http://127.0.0.1/', 'http://[::1]/', 'http://169.254.169.254/', 'http://10.1.2.3/', 'https://example.com:22/'])
def test_rejects_unsafe_target(url, monkeypatch):
    monkeypatch.setattr(socket, 'getaddrinfo', lambda *args, **kwargs: [(2, 1, 6, '', ('127.0.0.1', 80))])
    with pytest.raises(ValueError):
        public_target(url)


def test_pins_public_ip_host_and_tls_name(monkeypatch):
    monkeypatch.setattr(socket, 'getaddrinfo', lambda *args, **kwargs: [(2, 1, 6, '', ('93.184.216.34', 443))])
    target, host, tls = public_target('https://example.com/a?q=x#fragment')
    assert str(target) == 'https://93.184.216.34/a?q=x'
    assert host == 'example.com'
    assert tls == 'example.com'


def test_redirect_to_private_address_is_rejected(monkeypatch):
    monkeypatch.setattr(socket, 'getaddrinfo', lambda host, *a, **k: [(2, 1, 6, '', ('127.0.0.1' if host == 'localhost' else '93.184.216.34', 443))])
    calls = []
    def handler(request):
        calls.append(request)
        assert request.headers['host'] == 'example.com'
        assert request.extensions['sni_hostname'] == 'example.com'
        return httpx.Response(302, headers={'location': 'http://localhost/private'})
    with pytest.raises(ValueError):
        fetch_document('https://example.com/a', transport=httpx.MockTransport(handler))
    assert len(calls) == 1


def test_download_size_limit_and_encoding(monkeypatch):
    monkeypatch.setattr(socket, 'getaddrinfo', lambda *a, **k: [(2, 1, 6, '', ('93.184.216.34', 443))])
    html = f'<meta charset="gb2312"><article><p>{TEXT}</p></article>'
    result = fetch_document('https://example.com/a', transport=httpx.MockTransport(lambda r: httpx.Response(200, content=html.encode('gb18030'), headers={'content-type': 'text/html'})))
    assert TEXT in result['text']
    with pytest.raises(ValueError, match='过大'):
        fetch_document('https://example.com/a', transport=httpx.MockTransport(lambda r: httpx.Response(200, content=b'x' * 101)), max_bytes=100)



def test_keeps_unwrapped_and_nested_body_text():
    result = extract_html(f'<article>开头正文。<div>{TEXT}<p>嵌套段落。</p>结尾正文。</div><p>最后一段。</p></article>')
    for phrase in ['开头正文。', TEXT, '嵌套段落。', '结尾正文。', '最后一段。']:
        assert phrase in result['text']


def test_rejects_explicit_paywall_instead_of_showing_teaser_as_original():
    html = '<script type="application/ld+json">{"@type":"NewsArticle","isAccessibleForFree":false}</script>' + f'<article><p>{TEXT}</p><div class="paywall">Subscribe to continue reading</div></article>'
    with pytest.raises(ValueError, match='订阅'):
        extract_html(html)


@pytest.mark.parametrize('tag', ['main', 'article'])
def test_rejects_headline_link_directory_in_every_candidate(tag):
    links = ''.join(f'<a href="/news/{i}">最新新闻标题以及内容摘要这是第{i}条新闻。</a>' for i in range(10))
    with pytest.raises(ValueError):
        extract_html(f'<{tag}>{links}</{tag}>')


def test_rejects_subscription_gate_with_no_paywall_class():
    with pytest.raises(ValueError, match='订阅'):
        extract_html(f'<article><p>{TEXT}</p><div class="subscription-gate">订阅后阅读完整文章</div></article>')


@pytest.mark.parametrize('hidden', ['hidden', 'aria-hidden="true"', 'style="display: none"'])
def test_ignores_inactive_paywall_templates(hidden):
    assert TEXT in extract_html(f'<article><p>{TEXT}</p></article><div id="paywall-modal" {hidden}>Subscribe to continue reading</div>')['text']
