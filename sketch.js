/* ────────── A. 설정 상수·전역(동일) ────────── */
const CANVAS_W = 640, CANVAS_H = 480;
const TARGET_EMOS = ["happy", "sad", "surprised"];
const EMO_THRESHOLD = 0.90;
const COOLDOWN_MS = 2500;
const LOCK_MS     = 1000;
const FACE_GRACE_MS = 300;

let capture, faceapi, detections = [];
let currentEmotion = null;
let lastTriggerMS  = -COOLDOWN_MS;
let lockUntilMS    = 0;
let lastFaceMS     = -Infinity;
let lastKpXY       = [];

let bangImg;
function preload() { bangImg = loadImage("bang.png"); }

/* ────────── B. setup / gotFaces (동일) ────────── */
function setup() {
  createCanvas(CANVAS_W, CANVAS_H);
  capture = createCapture(VIDEO);
  capture.size(CANVAS_W, CANVAS_H);
  capture.hide();
  faceapi = ml5.faceApi(
    capture,
    {withLandmarks:true, withExpressions:true, withDescriptors:false},
    () => faceapi.detect(gotFaces)
  );
  const whatBtn = createButton("what");
  whatBtn.position(10, CANVAS_H + 10);
  whatBtn.mousePressed(() => {
    if (lastKpXY.length) startWhatAnimation(lastKpXY);
  });
  
}
function gotFaces(err, res) {
  if (err) { console.error(err); return; }
  detections = res;
  faceapi.detect(gotFaces);
}

/* ────────── C. draw 루프 ────────── */
function draw() {
  image(capture, 0, 0, CANVAS_W, CANVAS_H);

  /* 1) 얼굴 좌표 확보 */
  let expr = null;
  if (detections.length) {
    const f = detections[0];
    lastKpXY = f.landmarks.positions.map(p => ({x:p._x, y:p._y}));
    lastFaceMS = millis();
    expr = f.expressions;
  }
  const now = millis();
  const faceValid = now - lastFaceMS < FACE_GRACE_MS;
  if (!faceValid && !lastKpXY.length) return;   // 시작 직후 완전 무검출

  /* 2) 감정 판정 */
  if (expr) {
    let bestEmo = null, bestVal = 0;
    for (const e of TARGET_EMOS) {
      const v = expr[e]; if (v > bestVal) { bestVal = v; bestEmo = e; }
    }
    const cooldownOver = now - lastTriggerMS >= COOLDOWN_MS;
    const lockOver     = now >= lockUntilMS;

    /* ───────────── 여기 ↓ 수정 ───────────── */
    const sameAsCurrent = bestEmo === currentEmotion;
    const allowRepeat   = bestEmo === "happy";  // happy는 반복 허용
    if (bestVal > EMO_THRESHOLD && cooldownOver && lockOver &&
        (!sameAsCurrent || allowRepeat)) {

      if (currentEmotion === "happy") resetHappy(57); // 기존 happy 잔여 정리

      // 새 감정 초기화
      if      (bestEmo === "sad")       triggerSadAnimation(lastKpXY);
      else if (bestEmo === "surprised") triggerSurpriseAnimation(lastKpXY);
      // happy는 drawHappyMulti 내부 초기화

      currentEmotion = bestEmo;
      lastTriggerMS  = now;
      lockUntilMS    = now + LOCK_MS;
    }
  }

  /* 3) 현재 감정 이펙트 그리기 */
  if (lastKpXY[57]) {
    const {x:mX, y:mY} = lastKpXY[57];
    if      (currentEmotion === "happy")     drawHappyMulti(57, mX, mY);
    else if (currentEmotion === "sad")       drawSad(57, mX, mY, lastKpXY);
    else if (currentEmotion === "surprised") drawSurprise(lastKpXY);
  }
  
  drawWhat(lastKpXY);

  /* 4) 디버그 텍스트 */
  push();
  fill(0, 150);  // 검정색, 투명도 150 (0~255)
  noStroke();
  rect(5, 5, 140, 70);  // x, y, width, height — 상황에 따라 크기 조절
  
  fill(255); noStroke(); textSize(14);
  text(`emotion: ${currentEmotion ?? "none"}`, 10, 20);

  if (expr) {
    let y=38; for (const e of TARGET_EMOS) {
      text(`${e}: ${expr[e].toFixed(3)}`, 10, y); y+=16;
    }
  }
  pop();
}
