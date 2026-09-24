"use client";
export default function Error({ reset }: { reset: () => void }) {
  return (
    <main className="loading">
      <h1>화면을 불러오지 못했어요.</h1>
      <button onClick={reset}>다시 시도</button>
    </main>
  );
}
