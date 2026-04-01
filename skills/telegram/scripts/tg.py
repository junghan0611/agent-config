#!/usr/bin/env python3
"""
tg.py — Telegram CLI via tdlib (libtdjson.so FFI)

힣봇군단과의 대화를 읽고 메시지를 보내는 에이전트 도구.
사용자 계정으로 접근하므로 봇 API와 달리 모든 대화를 읽을 수 있다.

의존성: libtdjson.so (NixOS tdlib 패키지, telega와 동일)
세션: ~/.tg-agent/ (telega와 별도)

Usage:
    tg.py auth                          # 최초 인증 (대화형)
    tg.py list                          # 봇 채팅 목록
    tg.py read <chat> [--limit N]       # 최근 메시지 읽기
    tg.py send <chat> "메시지"           # 메시지 보내기
"""

import argparse
import ctypes
import json
import os
import sys
import time
from pathlib import Path

# ============================================================================
# tdlib FFI
# ============================================================================

TDLIB_PATHS = [
    # NixOS home-manager
    "/nix/store/2d48xyrwlazpvhzc3b3wkznrp69yn78w-home-manager-path/lib/libtdjson.so",
    # fallback: find in nix store
]

def find_tdlib():
    """Find libtdjson.so"""
    for p in TDLIB_PATHS:
        if os.path.exists(p):
            return p
    # Dynamic search
    import subprocess
    try:
        result = subprocess.run(
            ["find", "/nix/store", "-name", "libtdjson.so", "-not", "-path", "*/src/*"],
            capture_output=True, text=True, timeout=5
        )
        for line in result.stdout.strip().split("\n"):
            if line and "home-manager" in line:
                return line
            if line:
                return line  # any match
    except Exception:
        pass
    return None


class TdLib:
    """Minimal tdlib JSON client wrapper"""

    def __init__(self, db_dir: str):
        lib_path = find_tdlib()
        if not lib_path:
            print("ERROR: libtdjson.so not found. Install tdlib via NixOS.", file=sys.stderr)
            sys.exit(1)

        self._lib = ctypes.CDLL(lib_path)
        self._lib.td_json_client_create.restype = ctypes.c_void_p
        self._lib.td_json_client_send.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
        self._lib.td_json_client_receive.restype = ctypes.c_char_p
        self._lib.td_json_client_receive.argtypes = [ctypes.c_void_p, ctypes.c_double]
        self._lib.td_json_client_destroy.argtypes = [ctypes.c_void_p]

        # Set log verbosity BEFORE creating client
        self._lib.td_json_client_execute.restype = ctypes.c_char_p
        self._lib.td_json_client_execute.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
        self._lib.td_json_client_execute(
            None,
            json.dumps({"@type": "setLogVerbosityLevel", "new_verbosity_level": 0}).encode("utf-8")
        )
        # Also suppress via log stream
        self._lib.td_json_client_execute(
            None,
            json.dumps({"@type": "setLogStream", "log_stream": {"@type": "logStreamEmpty"}}).encode("utf-8")
        )

        self._client = self._lib.td_json_client_create()
        self._db_dir = db_dir
        self._extra_counter = 0
        self._authorized = False
        self._lib.td_json_client_execute.restype = ctypes.c_char_p
        self._lib.td_json_client_execute.argtypes = [ctypes.c_void_p, ctypes.c_char_p]
        self._lib.td_json_client_execute(
            None,
            json.dumps({"@type": "setLogVerbosityLevel", "new_verbosity_level": 0}).encode("utf-8")
        )

    def send(self, data: dict) -> None:
        self._lib.td_json_client_send(
            self._client, json.dumps(data).encode("utf-8")
        )

    def receive(self, timeout: float = 5.0) -> dict | None:
        result = self._lib.td_json_client_receive(self._client, timeout)
        if result:
            return json.loads(result.decode("utf-8"))
        return None

    def execute(self, data: dict) -> dict | None:
        """Send and wait for matching response"""
        self._extra_counter += 1
        extra = str(self._extra_counter)
        data["@extra"] = extra
        self.send(data)

        deadline = time.time() + 30
        while time.time() < deadline:
            resp = self.receive(2.0)
            if resp is None:
                continue
            if resp.get("@extra") == extra:
                return resp
            # Handle auth updates
            self._handle_update(resp)
        return None

    def drain_updates(self, timeout: float = 1.0):
        """Drain pending updates"""
        while True:
            resp = self.receive(timeout)
            if resp is None:
                break
            self._handle_update(resp)

    def _handle_update(self, update: dict):
        t = update.get("@type", "")
        if t == "updateAuthorizationState":
            auth = update["authorization_state"]["@type"]
            if auth == "authorizationStateReady":
                self._authorized = True

    def close(self):
        self.send({"@type": "close"})
        # Drain close events
        for _ in range(20):
            resp = self.receive(1.0)
            if resp and resp.get("@type") == "updateAuthorizationState":
                if resp["authorization_state"]["@type"] == "authorizationStateClosed":
                    break
        self._lib.td_json_client_destroy(self._client)

    def authorize(self, interactive: bool = False):
        """Run authorization flow"""
        API_ID = 72239
        API_HASH = "bbf972f94cc6f0ee5da969d8d42a6c76"

        while True:
            resp = self.receive(10.0)
            if resp is None:
                if self._authorized:
                    return True
                continue

            if resp.get("@type") != "updateAuthorizationState":
                continue

            auth = resp["authorization_state"]
            state = auth["@type"]

            if state == "authorizationStateWaitTdlibParameters":
                self.send({
                    "@type": "setTdlibParameters",
                    "database_directory": self._db_dir,
                    "use_message_database": True,
                    "use_secret_chats": False,
                    "api_id": API_ID,
                    "api_hash": API_HASH,
                    "system_language_code": "ko",
                    "device_model": "tg-agent",
                    "system_version": "NixOS",
                    "application_version": "0.1",
                })

            elif state == "authorizationStateWaitPhoneNumber":
                if not interactive:
                    print("ERROR: Not authorized. Run 'tg.py auth' first.", file=sys.stderr)
                    return False
                phone = input("Phone number (with country code, e.g. +82...): ").strip()
                self.send({
                    "@type": "setAuthenticationPhoneNumber",
                    "phone_number": phone,
                })

            elif state == "authorizationStateWaitCode":
                if not interactive:
                    print("ERROR: Auth code needed. Run 'tg.py auth'.", file=sys.stderr)
                    return False
                code = input("Auth code (check Telegram app): ").strip()
                self.send({
                    "@type": "checkAuthenticationCode",
                    "code": code,
                })

            elif state == "authorizationStateWaitPassword":
                if not interactive:
                    print("ERROR: 2FA password needed. Run 'tg.py auth'.", file=sys.stderr)
                    return False
                pwd = input("2FA password: ").strip()
                self.send({
                    "@type": "checkAuthenticationPassword",
                    "password": pwd,
                })

            elif state == "authorizationStateReady":
                self._authorized = True
                return True

            elif state == "authorizationStateClosed":
                return False


# ============================================================================
# Commands
# ============================================================================

DB_DIR = os.path.expanduser("~/.tg-agent")


def cmd_auth():
    """Interactive authorization"""
    os.makedirs(DB_DIR, exist_ok=True)
    td = TdLib(DB_DIR)
    try:
        if td.authorize(interactive=True):
            print("✅ Authorization complete. Session saved to ~/.tg-agent/")
        else:
            print("❌ Authorization failed.", file=sys.stderr)
            sys.exit(1)
    finally:
        td.close()


def cmd_list():
    """List recent chats (bot chats highlighted)"""
    td = TdLib(DB_DIR)
    try:
        if not td.authorize(interactive=False):
            sys.exit(1)

        # Load chat list
        resp = td.execute({
            "@type": "loadChats",
            "chat_list": {"@type": "chatListMain"},
            "limit": 30,
        })

        # Get chats
        resp = td.execute({
            "@type": "getChats",
            "chat_list": {"@type": "chatListMain"},
            "limit": 30,
        })

        if not resp or resp.get("@type") == "error":
            # loadChats doesn't return chats directly, need to collect from updates
            td.drain_updates(3.0)

            # Try getChats again
            resp = td.execute({
                "@type": "getChats",
                "chat_list": {"@type": "chatListMain"},
                "limit": 30,
            })

        if resp and resp.get("@type") == "chats":
            chat_ids = resp.get("chat_ids", [])
            for cid in chat_ids[:20]:
                chat = td.execute({"@type": "getChat", "chat_id": cid})
                if chat and chat.get("@type") == "chat":
                    title = chat.get("title", "?")
                    chat_type = chat.get("type", {}).get("@type", "?")
                    is_bot = "bot" in title.lower()
                    marker = "🤖" if is_bot else "  "
                    print(f"{marker} {cid:>15} | {title} ({chat_type})")
        else:
            print("No chats found or error:", resp)
    finally:
        td.close()


def cmd_read(chat_query: str, limit: int = 20):
    """Read recent messages from a chat"""
    td = TdLib(DB_DIR)
    try:
        if not td.authorize(interactive=False):
            sys.exit(1)

        chat_id = resolve_chat(td, chat_query)
        if not chat_id:
            print(f"ERROR: Chat '{chat_query}' not found.", file=sys.stderr)
            sys.exit(1)

        # Must open chat to fetch history from server
        td.execute({"@type": "openChat", "chat_id": chat_id})
        time.sleep(0.5)

        # Get messages
        resp = td.execute({
            "@type": "getChatHistory",
            "chat_id": chat_id,
            "from_message_id": 0,
            "offset": 0,
            "limit": limit,
            "only_local": False,
        })

        if resp and resp.get("@type") == "messages":
            messages = resp.get("messages", [])
            for msg in reversed(messages):
                if not msg:
                    continue
                sender = get_sender_name(td, msg)
                text = extract_text(msg)
                date = time.strftime("%m-%d %H:%M", time.localtime(msg.get("date", 0)))
                print(f"[{date}] {sender}: {text}")
        else:
            print("No messages or error:", resp)

        td.execute({"@type": "closeChat", "chat_id": chat_id})
    finally:
        td.close()


def cmd_send(chat_query: str, message: str):
    """Send a message to a chat"""
    td = TdLib(DB_DIR)
    try:
        if not td.authorize(interactive=False):
            sys.exit(1)

        chat_id = resolve_chat(td, chat_query)
        if not chat_id:
            print(f"ERROR: Chat '{chat_query}' not found.", file=sys.stderr)
            sys.exit(1)

        resp = td.execute({
            "@type": "sendMessage",
            "chat_id": chat_id,
            "input_message_content": {
                "@type": "inputMessageText",
                "text": {
                    "@type": "formattedText",
                    "text": message,
                },
            },
        })

        if resp and resp.get("@type") == "message":
            print(f"✅ Sent to chat {chat_id}")
        else:
            print(f"❌ Send failed: {resp}", file=sys.stderr)
            sys.exit(1)
    finally:
        td.close()


# ============================================================================
# Helpers
# ============================================================================

def resolve_chat(td: TdLib, query: str) -> int | None:
    """Resolve chat by ID, bot username, or title substring"""
    # Direct ID
    try:
        return int(query)
    except ValueError:
        pass

    # Search by username or title
    query_lower = query.lower().lstrip("@")

    # Search chats
    resp = td.execute({
        "@type": "searchChats",
        "query": query_lower,
        "limit": 10,
    })

    if resp and resp.get("@type") == "chats":
        for cid in resp.get("chat_ids", []):
            chat = td.execute({"@type": "getChat", "chat_id": cid})
            if chat:
                title = chat.get("title", "").lower()
                if query_lower in title:
                    return cid

    # Also try searchPublicChat for @username
    resp = td.execute({
        "@type": "searchPublicChat",
        "username": query_lower,
    })
    if resp and resp.get("@type") == "chat":
        return resp.get("id")

    return None


def get_sender_name(td: TdLib, msg: dict) -> str:
    """Extract sender name from message"""
    sender = msg.get("sender_id", {})
    sender_type = sender.get("@type", "")

    if sender_type == "messageSenderUser":
        user = td.execute({"@type": "getUser", "user_id": sender["user_id"]})
        if user and user.get("@type") == "user":
            first = user.get("first_name", "")
            last = user.get("last_name", "")
            return f"{first} {last}".strip() or "?"
    elif sender_type == "messageSenderChat":
        chat = td.execute({"@type": "getChat", "chat_id": sender["chat_id"]})
        if chat:
            return chat.get("title", "?")
    return "?"


def extract_text(msg: dict) -> str:
    """Extract text content from message"""
    content = msg.get("content", {})
    content_type = content.get("@type", "")

    if content_type == "messageText":
        return content.get("text", {}).get("text", "")
    elif content_type == "messagePhoto":
        caption = content.get("caption", {}).get("text", "")
        return f"[Photo] {caption}" if caption else "[Photo]"
    elif content_type == "messageDocument":
        caption = content.get("caption", {}).get("text", "")
        doc_name = content.get("document", {}).get("file_name", "")
        return f"[Doc: {doc_name}] {caption}".strip()
    elif content_type == "messageSticker":
        emoji = content.get("sticker", {}).get("emoji", "")
        return f"[Sticker {emoji}]"
    elif content_type == "messageVoiceNote":
        return "[Voice]"
    elif content_type == "messageAnimation":
        return "[GIF]"
    else:
        return f"[{content_type}]"


# ============================================================================
# Main
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description="Telegram CLI for agents (tdlib)")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("auth", help="Interactive authorization")
    sub.add_parser("list", help="List recent chats")

    read_p = sub.add_parser("read", help="Read chat messages")
    read_p.add_argument("chat", help="Chat ID, @username, or title")
    read_p.add_argument("--limit", "-n", type=int, default=20, help="Number of messages")

    send_p = sub.add_parser("send", help="Send a message")
    send_p.add_argument("chat", help="Chat ID, @username, or title")
    send_p.add_argument("message", help="Message text")

    args = parser.parse_args()

    if args.command == "auth":
        cmd_auth()
    elif args.command == "list":
        cmd_list()
    elif args.command == "read":
        cmd_read(args.chat, args.limit)
    elif args.command == "send":
        cmd_send(args.chat, args.message)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
