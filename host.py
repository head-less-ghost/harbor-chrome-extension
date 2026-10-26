#!/usr/bin/env python3
"""
Native Messaging host for the Harbor Chrome extension.
Receives a URL from the browser and opens it with Harbor via the harbor:// URL scheme.
"""

import json
import struct
import subprocess
import sys
from urllib.parse import quote, urlparse

MAX = 1024 * 1024


def read_exact(n):
    buf = b""
    while len(buf) < n:
        chunk = sys.stdin.buffer.read(n - len(buf))
        if not chunk:
            return None
        buf += chunk
    return buf


def read_msg():
    header = read_exact(4)
    if header is None:
        return None
    length = struct.unpack("<I", header)[0]
    if length > MAX:
        raise ValueError("Message too large")
    body = read_exact(length)
    if body is None:
        raise ValueError("Incomplete message")
    return json.loads(body.decode("utf-8"))


def write_msg(obj):
    data = json.dumps(obj, separators=(",", ":")).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(data)))
    sys.stdout.buffer.write(data)
    sys.stdout.buffer.flush()


def usable_url(value):
    """Return the value if it is a plain http(s) URL, otherwise an empty string."""
    if not isinstance(value, str) or not value:
        return ""
    parsed = urlparse(value)
    if parsed.scheme not in ("http", "https") or not parsed.netloc:
        return ""
    return value


def scheme_url(url, referrer):
    out = "harbor://download?url=" + quote(url, safe="")
    ref = usable_url(referrer)
    if ref:
        out += "&referrer=" + quote(ref, safe="")
    return out


def handle(msg):
    if not isinstance(msg, dict):
        return {"ok": False, "error": "Expected a JSON object."}

    action = msg.get("action") or "download"

    if action == "ping":
        return {"ok": True, "host": "com.harbor.chrome"}

    if action != "download":
        return {"ok": False, "error": "Unknown action."}

    url = usable_url(msg.get("url"))
    if not url:
        return {"ok": False, "error": "Only valid HTTP/HTTPS URLs are accepted."}

    result = subprocess.run(
        ["/usr/bin/open", scheme_url(url, msg.get("referrer"))],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.PIPE,
        text=True,
        timeout=12,
        check=False,
    )

    if result.returncode == 0:
        return {"ok": True}

    detail = (result.stderr or "").strip()[:180]
    return {
        "ok": False,
        "error": "Could not open Harbor. Is it installed?" +
                 ((" " + detail) if detail else ""),
    }


def main():
    while True:
        try:
            msg = read_msg()
            if msg is None:
                return
            write_msg(handle(msg))
        except Exception as exc:
            try:
                write_msg({"ok": False, "error": str(exc)[:280]})
            except Exception:
                return


if __name__ == "__main__":
    main()
