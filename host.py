#!/usr/bin/env python3
"""
Native Messaging host for Harbor Chrome extension.
Receives a URL from Chrome and opens it with Harbor via the harbor:// URL scheme.
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


def main():
    while True:
        try:
            msg = read_msg()
            if msg is None:
                return

            url = ""
            if isinstance(msg, dict):
                url = msg.get("url") or ""
                # accept either {url: "..."} or {action: "download", url: "..."}

            parsed = urlparse(url)
            if parsed.scheme not in ("http", "https") or not parsed.netloc:
                write_msg({"ok": False, "error": "Only valid HTTP/HTTPS URLs are accepted."})
                continue

            scheme_url = "harbor://download?url=" + quote(url, safe="")

            result = subprocess.run(
                ["/usr/bin/open", scheme_url],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.PIPE,
                text=True,
                timeout=12,
                check=False,
            )

            if result.returncode == 0:
                write_msg({"ok": True})
            else:
                detail = (result.stderr or "").strip()[:180]
                write_msg({
                    "ok": False,
                    "error": "Could not open Harbor. Is it installed?" +
                             ((" " + detail) if detail else "")
                })
        except Exception as exc:
            try:
                write_msg({"ok": False, "error": str(exc)[:280]})
            except Exception:
                return


if __name__ == "__main__":
    main()
