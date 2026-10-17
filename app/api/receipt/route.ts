const MODEL = "gemini-3.5-flash-lite";
const MAX_BYTES = 4 * 1024 * 1024;

const PROMPT = (today: string) => `이 이미지는 영수증입니다. 다음 세 가지를 읽어 JSON으로 답하세요. 오늘 날짜는 ${today}입니다.

- amount: 손님이 최종적으로 결제한 합계 금액(원, 정수). '합계', '결제금액', '받을금액', '카드승인금액'에 해당하는 값입니다.
  부가세(VAT)·공급가액·과세물품가액, 받은 돈(현금 수령액·내신돈), 거스름돈, 할인 전 금액, 개별 품목 금액은 절대 사용하지 마세요.
- date: 결제 날짜, YYYY-MM-DD 형식. 연도가 없으면 오늘 날짜 기준으로 가장 가까운 과거 날짜의 연도를 쓰세요.
- place: 가게(사용처) 이름.

이미지가 영수증이 아니거나 어떤 값이 확실하지 않으면 추측하지 말고 그 값은 null로 두세요.`;

type Raw = { amount?: unknown; date?: unknown; place?: unknown };

function clean(raw: Raw) {
  const amount = typeof raw.amount === "number" && Number.isInteger(raw.amount) && raw.amount > 0 ? raw.amount : null;
  const date =
    typeof raw.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(raw.date) && !Number.isNaN(Date.parse(raw.date))
      ? raw.date
      : null;
  const place = typeof raw.place === "string" && raw.place.trim() ? raw.place.trim().slice(0, 100) : null;
  return { amount, date, place };
}

export async function POST(req: Request) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return Response.json({ error: "서버에 GEMINI_API_KEY가 설정되지 않았어요" }, { status: 500 });

  const form = await req.formData().catch(() => null);
  const image = form?.get("image");
  if (!(image instanceof File) || !image.type.startsWith("image/")) {
    return Response.json({ error: "이미지 파일을 올려주세요" }, { status: 400 });
  }
  if (image.size > MAX_BYTES) {
    return Response.json({ error: "이미지가 너무 커요 (4MB 이하)" }, { status: 413 });
  }

  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const data = Buffer.from(await image.arrayBuffer()).toString("base64");

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT(today) }, { inline_data: { mime_type: image.type, data } }] }],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            amount: { type: "INTEGER", nullable: true },
            date: { type: "STRING", nullable: true },
            place: { type: "STRING", nullable: true },
          },
          required: ["amount", "date", "place"],
        },
      },
    }),
    signal: AbortSignal.timeout(30000),
  }).catch(() => null);

  if (!res || !res.ok) {
    console.error("Gemini error", res?.status, await res?.text().catch(() => ""));
    return Response.json({ error: "영수증을 분석하지 못했어요. 직접 입력해 주세요" }, { status: 502 });
  }

  try {
    const json = await res.json();
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? "{}";
    return Response.json(clean(JSON.parse(text)));
  } catch {
    return Response.json({ error: "영수증을 분석하지 못했어요. 직접 입력해 주세요" }, { status: 502 });
  }
}
