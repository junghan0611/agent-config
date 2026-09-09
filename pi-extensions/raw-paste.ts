/**
 * raw-paste — 마커 없는 붙여넣기를 pi가 "줄마다 제출"로 오해하지 않게 한다.
 *
 * 왜 있나
 * -------
 * Termux(폰) → ssh → tmux → pi 환경에서 여러 줄을 붙여넣으면 한 덩어리로 들어오지
 * 않고 줄마다 따로 제출된다. 원인은 pi 설정 누락이 아니다 — pi의 `StdinBuffer`는
 * bracketed paste 마커(`ESC[200~ … ESC[201~`)가 붙은 입력만 paste로 인정하고,
 * 마커가 오지 않는 터미널/IME 경로에는 대비책이 아예 없다.
 *   측정: pi-mono 0.85.1 `packages/tui/src/stdin-buffer.ts` (444줄),
 *         `grep -rn 'rawPaste|unmarked' packages/tui/src/` → 0 hit.
 *
 * 같은 pi 계열인 oh-my-pi(omp)는 이걸 고쳤고, 그래서 같은 폰에서 omp만 멀쩡하다.
 *   측정: oh-my-pi `packages/tui/src/stdin-buffer.ts` L81 `RAW_PASTE_CLASSIFICATION_TIMEOUT_MS`,
 *         L91 `isRawMultilineBurst()`, L478–505 후보 버퍼링.
 *   커밋 e6b3e1acf0 (2026-07-17) — "buffered split raw paste bursts before
 *   classifying … leaving the original per-line submit bug. Fixes #5841".
 * prime-agent(0.8.1)에도 그 패치는 없다 (`packages/tui/src/stdin-buffer.ts` 385줄, 0 hit).
 *
 * 무엇을 하나
 * -----------
 * 두 구멍을 같이 막는다. 둘 다 확장 프로세스 안에서 프로토타입을 감싸는 것뿐이라
 * pi를 포크하지 않는다.
 *
 *   (A) 마커 미도달 — ESC가 없고 완결된 줄바꿈이 2개 이상인 stdin 읽기를
 *       paste로 승격시켜 `paste` 이벤트로 올린다. 한 번의 붙여넣기가 여러 read로
 *       쪼개져 오는 경우를 위해 첫 줄바꿈 읽기를 10ms 붙잡아 뒤 조각을 합친다.
 *       평범한 Enter는 창이 만료되면 원래 경로로 그대로 재생된다(= 10ms 지연뿐).
 *
 *   (B) 제어바이트 재인코딩 — tmux가 paste 안의 개행을 키 이벤트로 바꿔 보내면
 *       (`ESC[27;5;13~`, xterm modifyOtherKeys 형식) pi는 ESC만 버리고 `[27;5;13~`
 *       를 본문에 남긴다. pi가 이미 복원하는 csi-u 형식(`ESC[13;5u`)의 짝만
 *       추가로 복원한다.
 *
 * 왜 프로토타입 패치가 성립하나
 * -----------------------------
 * 확장이 import 하는 `@earendil-works/pi-tui`는 번들 내부 모듈 맵으로 연결된다
 * (`chunk-JVUZSMYM.js`의 `"@earendil-works/pi-tui": dist_exports`), 그리고 그
 * exports에 `StdinBuffer`가 들어 있다 — 즉 러닝 TUI가 쓰는 바로 그 클래스다.
 * 인스턴스가 이미 만들어진 뒤라도 프로토타입 메서드를 갈아끼우면 그대로 먹는다.
 *
 * 상류가 이 구멍을 막으면 이 파일은 지운다. PR은 내지 않는다(GLG 결정).
 *
 * 진단: pi 안에서 `/rawpaste`
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { StdinBuffer } from "@earendil-works/pi-tui";

const ESC = "\x1b";

/** 첫 줄바꿈 읽기를 붙잡아 두는 창. 인접한 PTY read를 합치되 체감되지 않는 길이. */
const RAW_WINDOW_MS = 10;

/**
 * tmux xterm modifyOtherKeys 형식으로 재인코딩된 Ctrl+<letter>.
 * 주의: 코드포인트는 제어바이트가 아니라 **글자**다 — paste 안의 CR은 13이 아니라
 * Ctrl+M = 109('m')로 온다. TAB=105, LF=106. 그래서 a-z/A-Z만 되돌린다.
 */
const REENCODED_CTRL_XTERM = /\x1b\[27;5;(\d+)~/g;

const PATCH_FLAG = "__glgRawPastePatched";

type RawState = {
	cand: string;
	timer: ReturnType<typeof setTimeout> | null;
};

const stats = {
	patched: false,
	reason: "",
	coalesced: 0,
	replayed: 0,
	xtermDecoded: 0,
};

const STATE = Symbol.for("glg.rawPaste.state");

function stateOf(self: any): RawState {
	let st = self[STATE] as RawState | undefined;
	if (!st) {
		st = { cand: "", timer: null };
		self[STATE] = st;
	}
	return st;
}

/**
 * 완결된 논리 줄바꿈이 둘이고 그 뒤에 내용이 더 있는가 (= 세 번째 줄 조각).
 * Enter 한 번은 주변 키와 한 read에 실려 올 수 있어 하나로는 판별이 안 된다.
 * CRLF는 하나로 센다. oh-my-pi `isRawMultilineBurst`와 같은 판정.
 */
function isRawMultilineBurst(text: string): boolean {
	let breaks = 0;
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		if (code === 0x0d) {
			breaks++;
			if (text.charCodeAt(i + 1) === 0x0a) i++;
			continue;
		}
		if (code === 0x0a) {
			breaks++;
			continue;
		}
		if (breaks >= 2) return true;
	}
	return false;
}

function decodeReencodedCtrl(match: string, code: string): string {
	const cp = Number(code);
	if (cp >= 97 && cp <= 122) return String.fromCharCode(cp - 96);
	if (cp >= 65 && cp <= 90) return String.fromCharCode(cp - 64);
	return match;
}

/** (B) paste 본문 안의 xterm 형식 재인코딩만 원래 제어바이트로 되돌린다. */
function decodeXtermReencodedPaste(text: string): string {
	REENCODED_CTRL_XTERM.lastIndex = 0;
	if (!REENCODED_CTRL_XTERM.test(text)) return text;
	stats.xtermDecoded++;
	return text.replace(REENCODED_CTRL_XTERM, decodeReencodedCtrl);
}

/**
 * 이 pi 빌드의 StdinBuffer가 우리가 아는 모양인지 확인한다. 내부 필드 이름이
 * 바뀌면(예: `#buffer` private) 조용히 오작동하는 대신 패치를 걸지 않는다.
 * 외부 경계 확인이지 예외 삼키기가 아니다 — 결과는 `/rawpaste`가 그대로 보고한다.
 */
function shapeMatches(): string {
	const proto = (StdinBuffer as any)?.prototype;
	if (typeof proto?.process !== "function") return "StdinBuffer.prototype.process 없음";
	if (typeof proto?.emit !== "function") return "StdinBuffer.prototype.emit 없음";
	const probe: any = new (StdinBuffer as any)({});
	if (typeof probe.buffer !== "string") return "instance.buffer가 string이 아님";
	if (typeof probe.pasteMode !== "boolean") return "instance.pasteMode가 boolean이 아님";
	if (typeof probe.destroy === "function") probe.destroy();
	return "";
}

function installPatch(): void {
	const g = globalThis as any;
	if (g[PATCH_FLAG]) {
		stats.patched = true;
		stats.reason = "이미 적용됨";
		return;
	}

	const mismatch = shapeMatches();
	if (mismatch) {
		stats.patched = false;
		stats.reason = mismatch;
		return;
	}

	const proto = (StdinBuffer as any).prototype;
	const origProcess = proto.process;
	const origEmit = proto.emit;
	const origClear = proto.clear;

	const clearTimer = (st: RawState) => {
		if (st.timer) {
			clearTimeout(st.timer);
			st.timer = null;
		}
	};

	/** 애매한 후보를 원래 키 경로로 그대로 되돌려 보낸다. */
	const replay = (self: any, st: RawState) => {
		clearTimer(st);
		const pending = st.cand;
		st.cand = "";
		if (pending) {
			stats.replayed++;
			origProcess.call(self, pending);
		}
	};

	/** 후보를 paste로 승격시킨다. ProcessTerminal이 마커를 다시 씌워 넘긴다. */
	const promote = (self: any, st: RawState) => {
		clearTimer(st);
		const content = st.cand;
		st.cand = "";
		stats.coalesced++;
		origEmit.call(self, "paste", content);
	};

	proto.process = function (this: any, data: unknown) {
		const str = typeof data === "string" ? data : String(data);
		const st = stateOf(this);

		// 마커가 이미 잡힌 붙여넣기는 상류 경로가 온전히 처리한다.
		if (this.pasteMode) return origProcess.call(this, data);

		if (st.cand) {
			if (str.indexOf(ESC) !== -1) {
				// ESC가 섞인 입력은 마커 없는 붙여넣기일 수 없다. 후보를 먼저 흘려보낸다.
				replay(this, st);
				return origProcess.call(this, data);
			}
			st.cand += str;
			if (isRawMultilineBurst(st.cand)) promote(this, st);
			return;
		}

		if (
			this.buffer.length === 0 &&
			str.indexOf(ESC) === -1 &&
			(str.indexOf("\r") !== -1 || str.indexOf("\n") !== -1)
		) {
			st.cand = str;
			if (isRawMultilineBurst(st.cand)) {
				promote(this, st);
				return;
			}
			st.timer = setTimeout(() => replay(this, st), RAW_WINDOW_MS);
			if (typeof (st.timer as any)?.unref === "function") (st.timer as any).unref();
			return;
		}

		return origProcess.call(this, data);
	};

	proto.emit = function (this: any, event: string, ...args: unknown[]) {
		if (event === "paste" && typeof args[0] === "string") {
			args[0] = decodeXtermReencodedPaste(args[0] as string);
		}
		return origEmit.call(this, event, ...args);
	};

	if (typeof origClear === "function") {
		proto.clear = function (this: any) {
			const st = stateOf(this);
			clearTimer(st);
			st.cand = "";
			return origClear.call(this);
		};
	}

	g[PATCH_FLAG] = true;
	stats.patched = true;
	stats.reason = "적용됨";
}

export default function (pi: ExtensionAPI) {
	installPatch();

	pi.registerCommand("rawpaste", {
		description: "마커 없는 붙여넣기 보정 상태 (raw-paste 확장)",
		handler: async (_args: string, ctx: any) => {
			const lines = [
				`patch: ${stats.patched ? "on" : "off"} (${stats.reason})`,
				`raw paste coalesced: ${stats.coalesced}`,
				`ordinary enter replayed: ${stats.replayed}`,
				`xterm re-encoded paste decoded: ${stats.xtermDecoded}`,
				"",
				"coalesced가 오르면 터미널이 bracketed paste 마커를 안 보내는 것(A).",
				"xtermDecoded가 오르면 tmux가 paste 안 제어바이트를 재인코딩하는 것(B).",
				"둘 다 0인데 붙여넣기가 정상이면 이 환경은 원래 마커가 잘 오는 곳이다.",
			];
			ctx.ui?.notify?.(lines.join("\n"), "info");
		},
	});
}
