"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const CATEGORIES = [
  { name: "식비", emoji: "🍙", color: "var(--pink)" },
  { name: "카페", emoji: "🧋", color: "var(--yellow)" },
  { name: "교통", emoji: "🚌", color: "var(--mint)" },
  { name: "쇼핑", emoji: "🛍️", color: "var(--lilac)" },
  { name: "구독", emoji: "📺", color: "var(--sky)" },
  { name: "기타", emoji: "🎀", color: "var(--peach)" },
] as const;

type Expense = {
  id: number;
  amount: number;
  place: string;
  category: string;
  date: string; // YYYY-MM-DD
  memo: string;
};

const R = 15.5;
const CIRC = 2 * Math.PI * R;

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("resize failed"))), "image/jpeg", 0.85),
  );
}

function todayStr() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function dateLabel(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  const w = ["일", "월", "화", "수", "목", "금", "토"][new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${w})`;
}

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [place, setPlace] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0].name);
  const [date, setDate] = useState(todayStr);
  const [memo, setMemo] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState("");

  useEffect(() => {
    supabase
      .from("expenses")
      .select("id, amount, place, category, date, memo")
      .order("date", { ascending: false })
      .order("id", { ascending: false })
      .then(({ data, error }) => {
        if (error) setError("불러오지 못했어요: " + error.message);
        else setExpenses(data);
        setLoading(false);
      });
  }, []);

  const monthPrefix = todayStr().slice(0, 7);
  const monthNumber = Number(monthPrefix.slice(5));
  const monthTotal = expenses
    .filter((e) => e.date.startsWith(monthPrefix))
    .reduce((sum, e) => sum + e.amount, 0);

  const stats = CATEGORIES.map((c) => ({
    ...c,
    total: expenses
      .filter((e) => e.date.startsWith(monthPrefix) && e.category === c.name)
      .reduce((sum, e) => sum + e.amount, 0),
  })).filter((c) => c.total > 0);

  const groups = Object.entries(
    expenses.reduce<Record<string, Expense[]>>((acc, e) => {
      (acc[e.date] ??= []).push(e);
      return acc;
    }, {}),
  ).sort(([a], [b]) => b.localeCompare(a));

  const canSave = Number(amount) > 0 && place.trim() !== "" && date !== "";

  function openForm() {
    setAmount("");
    setPlace("");
    setCategory(CATEGORIES[0].name);
    setDate(todayStr());
    setMemo("");
    setScanMsg("");
    setOpen(true);
  }

  async function scanReceipt(ev: React.ChangeEvent<HTMLInputElement>) {
    const file = ev.target.files?.[0];
    ev.target.value = "";
    if (!file) return;
    setScanning(true);
    setScanMsg("");
    try {
      const body = new FormData();
      body.append("image", await shrink(file), "receipt.jpg");
      const res = await fetch("/api/receipt", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAmount(data.amount ? String(data.amount) : "");
      setPlace(data.place ?? "");
      setDate(data.date ?? "");
      const missing = [
        !data.amount && "금액",
        !data.place && "사용처",
        !data.date && "날짜",
      ].filter(Boolean);
      setScanMsg(
        missing.length
          ? `${missing.join(", ")} 항목은 읽지 못했어요. 직접 입력해 주세요. 읽은 값도 꼭 확인해 주세요!`
          : "영수증에서 읽어왔어요. 내용을 확인하고 저장해 주세요!",
      );
    } catch (e) {
      setScanMsg(e instanceof Error && e.message ? e.message : "영수증을 읽지 못했어요. 직접 입력해 주세요");
    } finally {
      setScanning(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    const { data, error } = await supabase
      .from("expenses")
      .insert({ amount: Number(amount), place: place.trim(), category, date, memo: memo.trim() })
      .select("id, amount, place, category, date, memo")
      .single();
    if (error) {
      setError("저장하지 못했어요: " + error.message);
      return;
    }
    setError("");
    setExpenses((prev) => [...prev, data]);
    setOpen(false);
  }

  async function remove(id: number) {
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) {
      setError("삭제하지 못했어요: " + error.message);
      return;
    }
    setError("");
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <main className="app">
      <header className="hero">
        <div className="title">✿ 꾸꾸 가계부 ✿</div>
        <div className="hero-label">{monthNumber}월에 쓴 돈</div>
        <div className="hero-total">{won(monthTotal)}</div>
      </header>

      {monthTotal > 0 && (
        <section className="stats">
          <div className="stats-title">카테고리별 지출</div>
          <div className="stats-body">
            <svg viewBox="0 0 42 42" className="donut" role="img" aria-label="카테고리별 지출 원그래프">
              <circle cx="21" cy="21" r={R} fill="none" strokeWidth="9" stroke="#f1e4ee" />
              {
                stats.reduce<{ offset: number; nodes: React.ReactNode[] }>(
                  (acc, c) => {
                    const len = (c.total / monthTotal) * CIRC;
                    acc.nodes.push(
                      <circle
                        key={c.name}
                        cx="21"
                        cy="21"
                        r={R}
                        fill="none"
                        strokeWidth="9"
                        style={{ stroke: c.color }}
                        strokeDasharray={`${len} ${CIRC - len}`}
                        strokeDashoffset={-acc.offset}
                        transform="rotate(-90 21 21)"
                      />,
                    );
                    acc.offset += len;
                    return acc;
                  },
                  { offset: 0, nodes: [] },
                ).nodes
              }
              <circle cx="21" cy="21" r="12.5" fill="none" stroke="var(--ink)" strokeWidth="0.6" />
              <circle cx="21" cy="21" r="20" fill="none" stroke="var(--ink)" strokeWidth="0.6" />
            </svg>
            <ul className="legend">
              {[...stats]
                .sort((a, b) => b.total - a.total)
                .map((c) => (
                  <li key={c.name}>
                    <span className="dot" style={{ background: c.color }} />
                    <span className="legend-name">
                      {c.emoji} {c.name}
                    </span>
                    <span className="legend-pct">{Math.round((c.total / monthTotal) * 100)}%</span>
                  </li>
                ))}
            </ul>
          </div>
        </section>
      )}

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="empty">
          <div className="empty-emoji">⏳</div>
          <p>불러오는 중...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="empty">
          <div className="empty-emoji">🐣</div>
          <p>아직 쓴 돈이 없어요!</p>
          <p>아래 + 버튼으로 기록해봐요</p>
        </div>
      ) : (
        groups.map(([d, items]) => (
          <section key={d} className="day">
            <div className="day-head">
              <span className="day-label">{dateLabel(d)}</span>
              <span className="day-sum">{won(items.reduce((s, e) => s + e.amount, 0))}</span>
            </div>
            <ul>
              {items.map((e) => {
                const cat = CATEGORIES.find((c) => c.name === e.category)!;
                return (
                  <li key={e.id} className="item">
                    <span className="badge" style={{ background: cat.color }}>
                      {cat.emoji}
                    </span>
                    <div className="item-main">
                      <div className="item-place">{e.place}</div>
                      <div className="item-sub">
                        {e.category}
                        {e.memo && ` · ${e.memo}`}
                      </div>
                    </div>
                    <div className="item-right">
                      <div className="item-amount">{won(e.amount)}</div>
                      <button className="del" onClick={() => remove(e.id)} aria-label="삭제">
                        삭제
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))
      )}

      <button className="fab" onClick={openForm} aria-label="지출 입력">
        +
      </button>

      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <form className="sheet" onClick={(ev) => ev.stopPropagation()} onSubmit={save}>
            <div className="sheet-title">💸 지출 기록하기</div>

            <label className={"scan" + (scanning ? " busy" : "")}>
              {scanning ? "⏳ 영수증 읽는 중..." : "📷 영수증으로 채우기"}
              <input type="file" accept="image/*" onChange={scanReceipt} disabled={scanning} hidden />
            </label>
            {scanMsg && <div className="scan-msg">{scanMsg}</div>}

            <label>
              금액
              <input
                inputMode="numeric"
                placeholder="0"
                value={amount ? Number(amount).toLocaleString("ko-KR") : ""}
                onChange={(ev) => setAmount(ev.target.value.replace(/\D/g, "").slice(0, 10))}
                autoFocus
              />
            </label>

            <label>
              사용처
              <input placeholder="어디에서 썼나요?" value={place} onChange={(ev) => setPlace(ev.target.value)} />
            </label>

            <div className="field">
              카테고리
              <div className="chips">
                {CATEGORIES.map((c) => (
                  <button
                    type="button"
                    key={c.name}
                    className={"chip" + (category === c.name ? " on" : "")}
                    style={category === c.name ? { background: c.color } : undefined}
                    onClick={() => setCategory(c.name)}
                  >
                    {c.emoji} {c.name}
                  </button>
                ))}
              </div>
            </div>

            <label>
              날짜
              <input type="date" value={date} onChange={(ev) => setDate(ev.target.value)} />
            </label>

            <label>
              메모
              <input placeholder="(선택) 한 줄 메모" value={memo} onChange={(ev) => setMemo(ev.target.value)} />
            </label>

            <div className="actions">
              <button type="button" className="btn ghost" onClick={() => setOpen(false)}>
                취소
              </button>
              <button type="submit" className="btn" disabled={!canSave}>
                저장하기
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
