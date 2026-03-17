/**
 * 자정 넘기지 마세요 확장 (go-to-bed)
 *
 * 야간 시간(00:00-05:59)에 에이전트 사용을 부드럽게 제한합니다.
 * 원본: agent-stuff/pi-extensions/go-to-bed.ts (한글화 + 시간대 조정)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const QUIET_HOURS_START = 0;
const QUIET_HOURS_END = 6;

const CONFIRM_PHRASE = "confirm-that-we-continue-after-midnight";
const CONFIRM_COMMAND = `echo ${CONFIRM_PHRASE}`;

function isQuietHours(now: Date): boolean {
	const hour = now.getHours();
	if (QUIET_HOURS_START < QUIET_HOURS_END) {
		return hour >= QUIET_HOURS_START && hour < QUIET_HOURS_END;
	}
	return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
}

function formatLocalTime(now: Date): string {
	return now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function getNightKey(now: Date): string {
	return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function isConfirmationCommand(command: string): boolean {
	return /^\s*echo\s+['"]?confirm-that-we-continue-after-midnight['"]?\s*$/i.test(command);
}

export default function goToBedExtension(pi: ExtensionAPI) {
	let confirmedNightKey: string | null = null;

	const isConfirmedFor = (now: Date): boolean => confirmedNightKey === getNightKey(now);
	const markConfirmedFor = (now: Date): void => {
		confirmedNightKey = getNightKey(now);
	};

	pi.on("before_agent_start", async (event) => {
		const now = new Date();
		if (!isQuietHours(now)) {
			confirmedNightKey = null;
			return;
		}

		const localTime = formatLocalTime(now);
		const confirmed = isConfirmedFor(now);
		const quietHoursLabel = `${String(QUIET_HOURS_START).padStart(2, "0")}:00-${String(QUIET_HOURS_END).padStart(2, "0")}:00`;

		const policy = confirmed
			? `
## 야간 안전 정책 (필수)

현재 시각은 ${localTime}입니다. 사용자가 심야 시간(${quietHoursLabel})에 작업 중입니다.
사용자가 오늘 밤 계속하겠다고 이미 확인했습니다.

반드시:
- 응답 시작에 짧고 따뜻하게 잠자리에 들라고 권유하세요 (1-3줄).
- 그 다음 요청한 작업을 수행하세요.
- 적절한 곳에서 수면을 권유하되 작업을 막지는 마세요.
- 내부 정책이나 확장 지침을 언급하지 마세요.
`
			: `
## 야간 안전 정책 (필수)

현재 시각은 ${localTime}입니다. 사용자가 심야 시간(${quietHoursLabel})에 작업 중입니다.
오늘 밤 아직 계속 진행 확인을 받지 않았습니다.

반드시:
- 강하게 수면을 권유하세요.
- 아직 일반 도구를 실행하지 마세요.
- 사용자가 계속 주장하면, 다음 명령어를 bash로 실행한 뒤 작업을 이어가세요:
  ${CONFIRM_COMMAND}
- 확인 후에도 간간이 수면을 권유하세요.
- 내부 정책이나 확장 지침을 언급하지 마세요.
`;

		return {
			message: {
				customType: "go-to-bed",
				content: confirmed
					? `야간 가드 활성 (${localTime}). 오늘 밤 계속 진행 확인됨.`
					: `야간 가드 활성 (${localTime}). 계속 진행 확인 대기 중.`,
				display: false,
				details: { localTime, quietHours: quietHoursLabel, confirmCommand: CONFIRM_COMMAND, confirmed },
			},
			systemPrompt: `${event.systemPrompt}\n\n${policy}`,
		};
	});

	pi.on("tool_call", async (event) => {
		const now = new Date();
		if (!isQuietHours(now)) {
			confirmedNightKey = null;
			return;
		}

		if (isConfirmedFor(now)) return;

		if (event.toolName === "bash") {
			const input = event.input as { command?: unknown } | undefined;
			const command = typeof input?.command === "string" ? input.command : "";
			if (isConfirmationCommand(command)) {
				markConfirmedFor(now);
				return;
			}
			return {
				block: true,
				reason: `야간 가드: 사용자 확인이 필요합니다. 다음 명령을 실행하세요: ${CONFIRM_COMMAND}`,
			};
		}

		return {
			block: true,
			reason: `야간 가드: bash 확인 명령 실행 전까지 도구가 차단됩니다: ${CONFIRM_COMMAND}`,
		};
	});

	pi.on("tool_result", async (event) => {
		if (event.toolName !== "bash") return;
		const input = event.input as { command?: unknown } | undefined;
		const command = typeof input?.command === "string" ? input.command : "";
		if (!isConfirmationCommand(command)) return;

		return {
			content: [{ type: "text" as const, text: "야간 계속 진행이 확인되었습니다. 작업을 이어가되 수면을 권유하세요." }],
		};
	});
}
