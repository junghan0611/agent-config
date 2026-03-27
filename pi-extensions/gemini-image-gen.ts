/**
 * Gemini Image Generation Extension
 *
 * GEMINI_API_KEY로 Gemini 이미지 생성 API를 호출, 결과를 터미널에 인라인 표시.
 * env-loader.ts가 session_start에서 ~/.env.local을 로드하므로,
 * execute 시점에 process.env.GEMINI_API_KEY를 읽는다.
 *
 * Note: @google/genai SDK는 extension 모듈 해석 경로에서 접근 불가하므로
 * REST API를 직접 호출한다 (antigravity-image-gen.ts와 동일한 전략).
 *
 * Usage:
 *   "고양이 사진 생성해줘"
 *   "16:9 배경화면으로 사이버펑크 도시 이미지 만들어줘"
 *   "save=none으로 노을 사진 생성"
 *
 * Save modes (save 파라미터):
 *   global  - ~/screenshot/ 에 저장 (기본값)
 *   none    - 저장 안 함
 *
 * 파일명 형식 (Denote 스타일):
 *   YYYYMMDDTHHMMSS--프롬프트슬러그__brand_nanobanana.png
 *
 * Environment variables:
 *   GEMINI_API_KEY  - Gemini API 키 (필수, ~/.env.local에 설정)
 *
 * 참고 모델:
 *   gemini-3.1-flash-image-preview  (기본값, "나노바나나 2flash")
 *   gemini-3-pro-image-preview       ("나노바나나 프로", 고품질/비쌈)
 */

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import os from "node:os";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { type Static, Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";

// ============================================================================
// Constants
// ============================================================================

/** 기본 이미지 생성 모델. 사용자 호칭: "나노바나나 2flash" */
const DEFAULT_MODEL = "gemini-3.1-flash-image-preview";

const GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";

const ASPECT_RATIOS = [
	"1:1",
	"16:9",
	"9:16",
	"4:3",
	"3:4",
	"3:2",
	"2:3",
	"21:9",
] as const;
type AspectRatio = (typeof ASPECT_RATIOS)[number];
const DEFAULT_ASPECT_RATIO: AspectRatio = "1:1";

const SAVE_MODES = ["none", "global"] as const;
type SaveMode = (typeof SAVE_MODES)[number];
const DEFAULT_SAVE_MODE: SaveMode = "global";

// ============================================================================
// Tool Parameters Schema
// ============================================================================

const TOOL_PARAMS = Type.Object({
	prompt: Type.String({ description: "생성할 이미지 설명" }),
	aspectRatio: Type.Optional(
		StringEnum(ASPECT_RATIOS, {
			description: `화면 비율. 기본값: ${DEFAULT_ASPECT_RATIO}`,
		}),
	),
	save: Type.Optional(
		StringEnum(SAVE_MODES, {
			description: `저장 모드. global=~/screenshot/에 저장(기본값), none=저장안함`,
		}),
	),
	model: Type.Optional(
		Type.String({
			description: `이미지 생성 모델 ID. 기본값: ${DEFAULT_MODEL}. 고품질: gemini-3-pro-image-preview`,
		}),
	),
	imageSize: Type.Optional(
		Type.String({
			description: "출력 해상도: 512, 1K, 2K, 4K. 기본값: 서버 기본(~1K). 4K는 프로 모델 권장",
		}),
	),
});

type ToolParams = Static<typeof TOOL_PARAMS>;

// ============================================================================
// Helpers
// ============================================================================

/** KST 타임스탬프 반환 (Denote identifier 형식: YYYYMMDDTHHMMSS) */
function toKstTimestamp(): string {
	const now = new Date();
	// KST = UTC+9
	const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
	const iso = kst.toISOString(); // "2026-03-27T12:34:56.789Z"
	// "20260327T123456"
	return iso.slice(0, 4) + iso.slice(5, 7) + iso.slice(8, 10) + "T" + iso.slice(11, 13) + iso.slice(14, 16) + iso.slice(17, 19);
}

/** 프롬프트를 파일명용 슬러그로 변환 */
function slugify(text: string, maxLen = 30): string {
	return text
		.toLowerCase()
		.replace(/[^\w\s]/g, " ") // 특수문자 → 공백
		.replace(/\s+/g, "-") // 공백 → 하이픈
		.replace(/-+/g, "-") // 중복 하이픈 정리
		.slice(0, maxLen)
		.replace(/-$/, ""); // 끝 하이픈 제거
}

/** MIME 타입에서 파일 확장자 추출 */
function imageExtension(mimeType: string): string {
	const lower = mimeType.toLowerCase();
	if (lower.includes("jpeg") || lower.includes("jpg")) return "jpg";
	if (lower.includes("webp")) return "webp";
	if (lower.includes("gif")) return "gif";
	return "png";
}

/** ~/screenshot/ 에 이미지 저장, 저장된 경로 반환 */
async function saveImageToScreenshot(
	base64Data: string,
	mimeType: string,
	prompt: string,
): Promise<string> {
	const screenshotDir = join(os.homedir(), "screenshot");
	await mkdir(screenshotDir, { recursive: true });

	const ts = toKstTimestamp();
	const slug = slugify(prompt);
	const ext = imageExtension(mimeType);
	// Denote 스타일: YYYYMMDDTHHMMSS--slug__brand_nanobanana.ext
	const filename = `${ts}--${slug}__brand_nanobanana.${ext}`;
	const filePath = join(screenshotDir, filename);

	await writeFile(filePath, Buffer.from(base64Data, "base64"));
	return filePath;
}

// ============================================================================
// Gemini REST API Types
// ============================================================================

interface GeminiPart {
	text?: string;
	inlineData?: {
		mimeType?: string;
		data?: string;
	};
}

interface GeminiCandidate {
	content?: {
		role?: string;
		parts?: GeminiPart[];
	};
	finishReason?: string;
}

interface GeminiResponse {
	candidates?: GeminiCandidate[];
	promptFeedback?: {
		blockReason?: string;
		blockReasonMessage?: string;
	};
	error?: {
		code?: number;
		message?: string;
		status?: string;
	};
}

// ============================================================================
// Extension Entry Point
// ============================================================================

export default function geminiImageGen(pi: ExtensionAPI) {
	pi.registerTool({
		name: "generate_image",
		label: "Generate image (Gemini)",
		description: [
			"Gemini API로 이미지를 생성합니다. 결과를 터미널에 인라인 표시.",
			"GEMINI_API_KEY 환경변수 필요 (~/.env.local).",
			"save=global(기본값)이면 ~/screenshot/에 Denote 파일명으로 저장.",
		].join(" "),
		parameters: TOOL_PARAMS,
		async execute(_toolCallId, params: ToolParams, signal, onUpdate) {
			// execute 시점에 읽기 — env-loader.ts가 session_start에서 로드 완료됨
			const apiKey = process.env.GEMINI_API_KEY;
			if (!apiKey) {
				throw new Error(
					"GEMINI_API_KEY가 없습니다. ~/.env.local에 GEMINI_API_KEY=... 를 추가하세요.",
				);
			}

			const model = params.model ?? DEFAULT_MODEL;
			const aspectRatio = params.aspectRatio ?? DEFAULT_ASPECT_RATIO;
			const saveMode = params.save ?? DEFAULT_SAVE_MODE;

			// 진행 상태 표시
			onUpdate?.({
				content: [
					{
						type: "text",
						text: `🎨 ${model} 로 이미지 생성 중... (비율: ${aspectRatio})`,
					},
				],
			});

			// Gemini generateContent REST API 호출
			const requestBody = {
				contents: [
					{
						role: "user",
						parts: [{ text: params.prompt }],
					},
				],
				generationConfig: {
					responseModalities: ["TEXT", "IMAGE"],
					imageConfig: {
					aspectRatio,
					...(params.imageSize ? { imageSize: params.imageSize } : {}),
				},
				},
			};

			const url = `${GEMINI_ENDPOINT}/models/${model}:generateContent?key=${apiKey}`;
			const response = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(requestBody),
				signal,
			});

			if (!response.ok) {
				const errorText = await response.text();
				throw new Error(
					`Gemini API 에러 (HTTP ${response.status}): ${errorText}`,
				);
			}

			const data = (await response.json()) as GeminiResponse;

			// API 레벨 에러 처리
			if (data.error) {
				throw new Error(
					`Gemini API 에러 [${data.error.code ?? "unknown"}]: ${data.error.message ?? "알 수 없는 에러"}`,
				);
			}

			// Safety block 체크
			if (data.promptFeedback?.blockReason) {
				throw new Error(
					`프롬프트 차단됨: ${data.promptFeedback.blockReason}. ${data.promptFeedback.blockReasonMessage ?? ""}`,
				);
			}

			// 응답에서 이미지/텍스트 파트 추출
			const parts = data.candidates?.[0]?.content?.parts ?? [];
			const textParts: string[] = [];
			let imageData: { data: string; mimeType: string } | undefined;

			for (const part of parts) {
				if (part.text) {
					textParts.push(part.text);
				}
				if (part.inlineData?.data) {
					imageData = {
						data: part.inlineData.data,
						mimeType: part.inlineData.mimeType ?? "image/png",
					};
				}
			}

			if (!imageData) {
				const candidateFinishReason =
					data.candidates?.[0]?.finishReason ?? "unknown";
				throw new Error(
					`이미지 데이터가 응답에 없습니다 (finishReason: ${candidateFinishReason}). ` +
						"모델이 이미지를 생성하지 않았거나, 안전 정책에 의해 차단되었을 수 있습니다.",
				);
			}

			// 저장 처리
			let savedPath: string | undefined;
			let saveError: string | undefined;
			if (saveMode !== "none") {
				try {
					savedPath = await saveImageToScreenshot(
						imageData.data,
						imageData.mimeType,
						params.prompt,
					);
				} catch (err) {
					saveError = err instanceof Error ? err.message : String(err);
				}
			}

			// 결과 요약 텍스트
			const summaryLines = [
				`✅ 이미지 생성 완료 (모델: ${model}, 비율: ${aspectRatio})`,
			];
			if (textParts.length > 0) {
				summaryLines.push(`모델 설명: ${textParts.join(" ")}`);
			}
			if (savedPath) {
				summaryLines.push(`💾 저장됨: ${savedPath}`);
			} else if (saveError) {
				summaryLines.push(`⚠️ 저장 실패: ${saveError}`);
			} else if (saveMode === "none") {
				summaryLines.push("(저장 생략됨: save=none)");
			}

			return {
				content: [
					{ type: "text", text: summaryLines.join("\n") },
					{
						type: "image",
						data: imageData.data,
						mimeType: imageData.mimeType,
					},
				],
				details: {
					model,
					aspectRatio,
					savedPath,
					saveMode,
					hasModelText: textParts.length > 0,
				},
			};
		},
	});
}
