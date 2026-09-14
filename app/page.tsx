"use client";
import { useEffect, useRef, useState } from "react";
import {
  DURATION,
  THEMES,
  loadPhoto,
  renderScene,
  type Photo,
  type Scene,
} from "@/lib/crane";
export type Tone = "soft" | "standard" | "sharp";

export default function Home() {
  const [photos, setPhotos] = useState<Photo[]>([]),
    [theme, setTheme] = useState(0),
    [title, setTitle] = useState("CATCH ME!"),
    [message, setMessage] = useState("");
  const [playing, setPlaying] = useState(false),
    [loading, setLoading] = useState(false),
    [progress, setProgress] = useState<number | null>(null),
    [error, setError] = useState(""),
    [quality, setQuality] = useState(480),
    [download, setDownload] = useState("");
  const canvas = useRef<HTMLCanvasElement>(null),
    worker = useRef<Worker | null>(null),
    downloadRef = useRef(""),
    busy = useRef(false),
    uploading = useRef(false);
  const scene: Scene = { photos, theme, title, message };
  const sceneRef = useRef(scene);
  sceneRef.current = scene;
  const disabled = progress !== null;
  useEffect(() => {
    let frame = 0,
      start = 0;
    const draw = (now: number) => {
      if (!start) start = now;
      const ctx = canvas.current?.getContext("2d");
      if (ctx)
        renderScene(
          ctx,
          sceneRef.current,
          playing ? (now - start) % DURATION : 0,
        );
      if (playing) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [playing, photos, theme, title, message]);
  useEffect(
    () => () => {
      worker.current?.terminate();
      if (downloadRef.current) URL.revokeObjectURL(downloadRef.current);
    },
    [],
  );
  function clearDownload() {
    if (downloadRef.current) URL.revokeObjectURL(downloadRef.current);
    downloadRef.current = "";
    setDownload("");
  }
  function changePhoto(index: number, changes: Partial<Photo>) {
    clearDownload();
    setPhotos((current) =>
      current.map((p, i) => (i === index ? { ...p, ...changes } : p)),
    );
  }
  async function upload(file: File | undefined, index: number) {
    if (!file || uploading.current || busy.current) return;
    uploading.current = true;
    setError("");
    setLoading(true);
    setPlaying(false);
    try {
      const image = await loadPhoto(file);
      clearDownload();
      setPhotos((current) => {
        const next = [...current];
        next[index] = {
          image,
          thumbnail: image.toDataURL(),
          name: current[index]?.name || "",
          scale: 1,
          rotation: 0,
          flip: false,
        };
        return next;
      });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "사진을 읽지 못했어. 다시 선택해 줘.",
      );
    } finally {
      uploading.current = false;
      setLoading(false);
    }
  }
  function cancel() {
    worker.current?.terminate();
    worker.current = null;
    busy.current = false;
    setProgress(null);
  }
  async function exportGif() {
    if (busy.current || uploading.current) return;
    busy.current = true;
    setError("");
    setPlaying(false);
    setProgress(0);
    clearDownload();
    try {
      await document.fonts.ready;
      if (!busy.current) return;
      const frozen = sceneRef.current;
      const out = document.createElement("canvas");
      out.width = quality;
      out.height = (quality * 4) / 3;
      const ctx = out.getContext("2d", { willReadFrequently: true });
      if (!ctx) throw new Error("Canvas unavailable");
      const w = new Worker(new URL("../lib/gif.worker.ts", import.meta.url));
      worker.current = w;
      let index = 0;
      const count = DURATION / 100;
      const fail = () => {
        cancel();
        setError("GIF 생성에 실패했어. 일반 화질로 다시 시도해 줘.");
      };
      const next = () => {
        if (index >= count) {
          w.postMessage({ type: "finish" });
          return;
        }
        renderScene(ctx, frozen, index * 100);
        const frame = ctx.getImageData(0, 0, out.width, out.height);
        w.postMessage(
          {
            type: "frame",
            data: frame.data.buffer,
            width: out.width,
            height: out.height,
          },
          [frame.data.buffer],
        );
        index++;
      };
      w.onerror = fail;
      w.onmessage = (event) => {
        if (event.data.type === "error") {
          fail();
          return;
        }
        if (event.data.type === "ready") next();
        if (event.data.type === "frame") {
          setProgress(Math.round((index / count) * 100));
          next();
        }
        if (event.data.type === "done") {
          const blob = new Blob([event.data.bytes], { type: "image/gif" });
          const url = URL.createObjectURL(blob);
          downloadRef.current = url;
          setDownload(url);
          cancel();
        }
      };
      w.postMessage({ type: "start" });
    } catch {
      cancel();
      setError("GIF를 준비하지 못했어. 새로고침 후 다시 시도해 줘.");
    }
  }
  return (
    <main>
      <header className="topbar">
        <a className="wordmark" href="/">
          catchu<span>!</span>
        </a>
        <span className="edition">YOUR LITTLE POCKET ARCADE</span>
        <span className="header-tag">PHOTO → GIF</span>
      </header>
      <section className="intro">
        <span className="eyebrow">✦ A PRIZE THAT’S ALL YOURS ✦</span>
        <h1>오늘의 경품은, 나의 최애.</h1>
        <p>
          사진 한 장, 작은 행운 한 스푼.
          <br />
          나만의 인형뽑기 움짤을 만들어 봐.
        </p>
      </section>
      <div className="studio">
        <section className="preview-area" aria-label="인형뽑기 미리보기">
          <div className="preview-heading">
            <span>THE PRIZE MACHINE</span>
            <span className="live-dot">{playing ? "PLAYING" : "PREVIEW"}</span>
          </div>
          <div className="canvas-wrap">
            <canvas
              ref={canvas}
              width={480}
              height={640}
              aria-label="사진이 들어가는 인형뽑기 기계"
            />
          </div>
          <div className="preview-actions">
            <button
              className="play-button"
              onClick={() => setPlaying(!playing)}
              disabled={disabled}
            >
              {playing ? "Ⅱ 정지" : "▷ 뽑아보기"}
            </button>
            <span>6초의 작은 행복 · 반복 재생</span>
          </div>
          <p className="sample-note">
            {photos.length === 0
              ? "지금은 샘플 인형이 들어 있어. 아래에서 최애를 넣어 줘!"
              : "사진은 이 기기에서만 처리되고 서버로 전송되지 않아."}
          </p>
        </section>
        <aside className="editor">
          <fieldset disabled={disabled || loading}>
            <section className="control-section">
              <div className="section-label">
                <span className="step">01</span>
                <h2>경품을 넣어 줘</h2>
                <span className="small-note">최대 두 명</span>
              </div>
              <div className="upload-grid">
                {Array.from(
                  { length: Math.min(2, photos.length + 1) },
                  (_, i) => (
                    <div className="photo-slot" key={i}>
                      <label
                        className={
                          "upload-box " + (photos[i] ? "has-photo" : "")
                        }
                      >
                        {photos[i] ? (
                          <img
                        src={photos[i].thumbnail}
                            alt={`캐릭터 ${i + 1}`}
                          />
                        ) : (
                          <>
                            <span className="upload-plus">＋</span>
                            <strong>
                              {i === 0 ? "사진 넣기" : "한 명 더"}
                            </strong>
                            <span>PNG · JPG · WebP</span>
                          </>
                        )}
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp"
                          aria-label={`캐릭터 ${i + 1} 사진 선택`}
                          onChange={(e) => {
                            upload(e.target.files?.[0], i);
                            e.target.value = "";
                          }}
                        />
                        {photos[i] && (
                          <span className="replace-label">사진 바꾸기</span>
                        )}
                      </label>
                      {photos[i] && (
                        <>
                          <input
                            className="name-input"
                            aria-label={`캐릭터 ${i + 1} 이름`}
                            maxLength={12}
                            placeholder="이름 (선택)"
                            value={photos[i].name}
                            onChange={(e) =>
                              changePhoto(i, { name: e.target.value })
                            }
                          />
                          <details>
                            <summary>크기·방향 조절</summary>
                            <label className="slider-label">
                              크기
                              <input
                                aria-label={`캐릭터 ${i + 1} 크기`}
                                type="range"
                                min="0.65"
                                max="1.2"
                                step="0.01"
                                value={photos[i].scale}
                                onChange={(e) =>
                                  changePhoto(i, { scale: +e.target.value })
                                }
                              />
                            </label>
                            <label className="slider-label">
                              회전
                              <input
                                aria-label={`캐릭터 ${i + 1} 회전`}
                                type="range"
                                min="-20"
                                max="20"
                                value={photos[i].rotation}
                                onChange={(e) =>
                                  changePhoto(i, { rotation: +e.target.value })
                                }
                              />
                            </label>
                            <div className="tiny-actions">
                              <button
                                onClick={() =>
                                  changePhoto(i, { flip: !photos[i].flip })
                                }
                              >
                                좌우 반전
                              </button>
                              <button
                                onClick={() =>
                                  changePhoto(i, {
                                    scale: 1,
                                    rotation: 0,
                                    flip: false,
                                  })
                                }
                              >
                                초기화
                              </button>
                            </div>
                          </details>
                          <button
                            className="remove"
                            onClick={() => {
                              clearDownload();
                              setPhotos((current) =>
                                current.filter((_, j) => j !== i),
                              );
                            }}
                          >
                            삭제
                          </button>
                        </>
                      )}
                    </div>
                  ),
                )}
              </div>
              <p className="hint">
                투명 PNG라면 인형처럼, 배경이 있으면 포토카드처럼.
                <br />
                투명 여백은 자동으로 정리해 줄게.
              </p>
              {loading && <p role="status">사진을 준비하는 중…</p>}
            </section>
            <section className="control-section">
              <div className="section-label">
                <span className="step">02</span>
                <h2>기계의 색</h2>
                <span className="small-note">{THEMES[theme].label}</span>
              </div>
              <div className="swatches">
                {THEMES.map((t, i) => (
                  <button
                    key={t.name}
                    aria-label={t.label}
                    aria-pressed={theme === i}
                    title={t.label}
                    className={theme === i ? "selected" : ""}
                    style={{ background: t.body }}
                    onClick={() => {
                      clearDownload();
                      setTheme(i);
                    }}
                  >
                    {theme === i ? "✓" : ""}
                  </button>
                ))}
              </div>
            </section>
            <section className="control-section">
              <div className="section-label">
                <span className="step">03</span>
                <h2>작은 한마디</h2>
                <span className="small-note">선택</span>
              </div>
              <label className="text-label">
                간판 문구<span>{title.length}/12</span>
                <input
                  maxLength={12}
                  value={title}
                  placeholder="CATCH ME!"
                  onChange={(e) => {
                    clearDownload();
                    setTitle(e.target.value);
                  }}
                />
              </label>
              <label className="text-label">
                당첨 문구<span>{message.length}/12</span>
                <input
                  maxLength={12}
                  value={message}
                  placeholder={photos.length === 2 ? "DOUBLE GET!" : "GET!"}
                  onChange={(e) => {
                    clearDownload();
                    setMessage(e.target.value);
                  }}
                />
              </label>
            </section>
            <div className="quality-row">
              <label htmlFor="quality">저장 크기</label>
              <select
                id="quality"
                value={quality}
                onChange={(e) => {
                  clearDownload();
                  setQuality(+e.target.value);
                }}
              >
                <option value={480}>일반 · 480 × 640</option>
                <option value={720}>고화질 · 720 × 960</option>
              </select>
            </div>
          </fieldset>
          <button
            className="export-button"
            disabled={disabled || loading || !photos.length}
            onClick={exportGif}
          >
            {disabled
              ? `GIF 만드는 중… ${progress}%`
              : "나의 경품 GIF 만들기  ↗"}
          </button>
          {disabled && (
            <div className="export-progress">
              <progress value={progress ?? 0} max={100} />
              <button onClick={cancel}>취소</button>
            </div>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          {download && (
            <div className="download-result">
              <p>경품 준비 완료! ♡</p>
              <a href={download} download="catchu-prize.gif">
                GIF 저장하기 ↓
              </a>
              <details>
                <summary>완성된 GIF 확인</summary>
                <img src={download} alt="완성된 인형뽑기 GIF" />
              </details>
            </div>
          )}
          <p className="privacy">
            회원가입 없이 · 사진 업로드 서버 없이 · 오직 내 최애
          </p>
        </aside>
      </div>
      <footer>
        <span className="wordmark">catchu!</span>
        <p>SMALL THINGS. BIG LOVE.</p>
        <span>개인적으로 사용 가능한 사진으로 만들어 줘 ♡</span>
      </footer>
    </main>
  );
}
