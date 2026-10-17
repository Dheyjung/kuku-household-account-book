"use client";

import { useEffect, useState } from "react";

const HASH_KEY = "kkukku-pw-hash";
const OPEN_KEY = "kkukku-unlocked";

async function sha256(text: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

type Status = "loading" | "setup" | "locked" | "open";

export default function LockScreen({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem(OPEN_KEY)) setStatus("open");
    else setStatus(localStorage.getItem(HASH_KEY) ? "locked" : "setup");
  }, []);

  function open() {
    sessionStorage.setItem(OPEN_KEY, "1");
    setPw("");
    setPw2("");
    setMsg("");
    setStatus("open");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "setup") {
      if (pw.length < 4) return setMsg("비밀번호는 4자 이상으로 정해주세요");
      if (pw !== pw2) return setMsg("두 비밀번호가 달라요");
      localStorage.setItem(HASH_KEY, await sha256(pw));
      open();
    } else if ((await sha256(pw)) === localStorage.getItem(HASH_KEY)) {
      open();
    } else {
      setPw("");
      setMsg("비밀번호가 틀렸어요");
    }
  }

  if (status === "open") return <>{children}</>;
  if (status === "loading") return null;

  const setup = status === "setup";
  return (
    <main className="app lock">
      <form className="lock-card" onSubmit={submit}>
        <div className="empty-emoji">{setup ? "🔑" : "🔒"}</div>
        <div className="title">✿ 꾸꾸 가계부 ✿</div>
        <p className="lock-text">{setup ? "처음이에요! 사용할 비밀번호를 정해주세요" : "비밀번호를 입력해주세요"}</p>
        <input
          type="password"
          placeholder="비밀번호"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          autoFocus
        />
        {setup && (
          <input
            type="password"
            placeholder="비밀번호 확인"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
          />
        )}
        {msg && <div className="lock-msg">{msg}</div>}
        <button type="submit" className="btn" disabled={!pw}>
          {setup ? "비밀번호 정하기" : "열기"}
        </button>
      </form>
    </main>
  );
}
