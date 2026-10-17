"use client";

import { useState } from "react";

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

const won = (n: number) => n.toLocaleString("ko-KR") + "원";

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
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [place, setPlace] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0].name);
  const [date, setDate] = useState(todayStr);
  const [memo, setMemo] = useState("");

  const monthPrefix = todayStr().slice(0, 7);
  const monthNumber = Number(monthPrefix.slice(5));
  const monthTotal = expenses
    .filter((e) => e.date.startsWith(monthPrefix))
    .reduce((sum, e) => sum + e.amount, 0);

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
    setOpen(true);
  }

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setExpenses((prev) => [
      ...prev,
      { id: Date.now(), amount: Number(amount), place: place.trim(), category, date, memo: memo.trim() },
    ]);
    setOpen(false);
  }

  function remove(id: number) {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <main className="app">
      <header className="hero">
        <div className="title">✿ 꾸꾸 가계부 ✿</div>
        <div className="hero-label">{monthNumber}월에 쓴 돈</div>
        <div className="hero-total">{won(monthTotal)}</div>
      </header>

      {groups.length === 0 ? (
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
