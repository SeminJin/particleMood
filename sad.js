/* ─────────────────────────────────────────────
 *  SAD ANIMATION MODULE
 *  ‣ 버튼 클릭 → triggerSadAnimation() 실행
 *  ‣ 그라디언트·눈물 Wisp·떨어지는 Bubble 로 슬픔 표현
 *  ‣ 작성자 요청: 색 팔레트 더 우울, 흔들림 강도 ↑
 * ───────────────────────────────────────────── */

/* ------------- 1. 전역 상태 ------------- */
let sadWisps        = [];   // 움직이는 눈물
let sadOrigins      = [];   // 그리드 원 위치
let fallingBubbles  = [];   // 바닥으로 떨어질 큰 버블
let gradientCenter  = { x: 0, y: 0 };
let sadStartTime    = 0;
const SAD_DURATION  = 3000; // ms
let state           = 'idle';   // idle | sadActive | falling
let sadTheme        = [];       // 현재 선택된 3색 팔레트

/* ------------- 2. API ------------- */
// 외부(버튼)에서 호출
function triggerSadAnimation() {
  setupSadColorTheme();      // 팔레트 랜덤 선택
  sadStartTime   = millis(); // 타이머 리셋
  sadWisps       = [];
  sadOrigins     = [];
  fallingBubbles = [];
  state          = 'sadActive';
}

/* ------------- 3. 팔레트 & 그라디언트 ------------- */
function setupSadColorTheme() {
  const themes = [
    [color('#A7ADB4'), color('#5D6770'), color('#272D34')], // 잿빛 블루
    [color('#9EB7B6'), color('#4B5F60'), color('#1A2627')], // 어두운 청록
    [color('#9299A5'), color('#535C66'), color('#1E242C')], // 먼지 낀 한밤
    [color('#B5BAC0'), color('#68727A'), color('#2B3238')], // 안개 철
    [color('#8E96A2'), color('#49515D'), color('#1B2128')]  // 탁한 인디고
  ];
  sadTheme = random(themes);
}

function getGradientColor(x, y) {
  const cx = gradientCenter.x;
  const cy = gradientCenter.y + 80;
  const t  = constrain(dist(x, y, cx, cy) /
              dist(cx, cy, width, height), 0, 1);

  return t < 0.5
    ? lerpColor(sadTheme[0], sadTheme[1], t * 2)
    : lerpColor(sadTheme[1], sadTheme[2], (t - 0.5) * 2);
}

/* ------------- 4. 메인 루프 ------------- */
function drawSad(index, cx, cy, keypoints) {
  if (state === 'idle') return;                // 대기 중이면 아무것도 안함
  
  /* 4-1. 상태 전환 체크 */
  if (millis() - sadStartTime >= SAD_DURATION && state === 'sadActive') {
    sadOrigins.forEach(p =>
      fallingBubbles.push(new FallingBubble(p.x, p.y, getGradientColor(p.x, p.y)))
    );
    sadWisps = [];
    sadOrigins = [];
    state = 'falling';
  }

  /* 4-2. 눈물 활성 단계 */
  if (state === 'sadActive') {
    // 얼굴 중심 계산 (입 기준 or 평균)
    const mouth = keypoints[27] ?? { x: 0, y: 0 };
    const center = mouth.x
      ? mouth
      : keypoints.reduce((a, p) => ({ x: a.x + p.x, y: a.y + p.y }),
          { x: 0, y: 0 });

    gradientCenter = {
      x: mouth.x ? mouth.x : center.x / keypoints.length,
      y: mouth.y ? mouth.y : center.y / keypoints.length
    };

    drawSadGrid(gradientCenter.x, gradientCenter.y, 80);

    // 눈물 Wisp 업데이트
    sadWisps = sadWisps.filter(w => { w.run(); return !w.isDead; });

    // 그리드 기점 원
    noStroke();
    for (const p of sadOrigins) {
      fill(getGradientColor(p.x, p.y));
      ellipse(p.x, p.y, 20);
    }
  }

  /* 4-3. 떨어지는 버블 단계 */
  if (state === 'falling') {
    fallingBubbles = fallingBubbles.filter(b => { b.run(); return !b.isDead; });
    if (fallingBubbles.length === 0) state = 'idle';
  }
}

/* ------------- 5. 그리드 + 흔들림 ------------- */
function drawSadGrid(cx, cy, radius) {
  const spacing = 50;
  sadOrigins = [];
  noiseDetail(2, 0.4);

  for (let y = 0; y <= height + spacing; y += spacing) {
    for (let x = 0; x <= width + spacing; x += spacing) {
      // 흔들림 세기 ↑ (계수 10→16, 12→18)
      const wobX = noise(x * 0.02, frameCount * 0.01) * 16 - 8;
      const wobY = noise(y * 0.02, frameCount * 0.01) * 18 - 9;

      const px = x + wobX;
      const py = y + wobY;
      if (px < 0 || py < 0 || px > width || py > height) continue;
      if (dist(px, py, cx, cy) <= radius) continue;

      sadOrigins.push({ x: px, y: py });
      if (random() < 0.006)
        sadWisps.push(new SadWisp(px, py, random(4, 12), spacing));
    }
  }
}

/* ------------- 6. 클래스를 이용한 개별 오브젝트 ------------- */
// 6-1. 눈물 Wisp (drips)
class SadWisp {
  constructor(x, y, d, r) {
    Object.assign(this, {
      originX: x, originY: y, x, y, d, originD: d,
      timer: 0, endTime: int(random(160, 240)), r,
      angle: random(PI / 6, PI / 2),
      speed: random(0.15, 0.35),
      isDead: false, clr: getGradientColor(x, y)
    });
    this.targetX = x + cos(this.angle) * this.speed * r;
    this.targetY = y + sin(this.angle) * this.speed * r + 10;
  }
  run() { this.update(); this.show(); this.link(); }
  update() {
    this.timer++;
    if (this.timer >= this.endTime) return void (this.isDead = true);
    const n = norm(this.timer, 0, this.endTime);
    this.x = lerp(this.originX, this.targetX, easeOutQuint(n));
    this.y = lerp(this.originY, this.targetY, easeOutQuint(n));
    this.d = lerp(this.originD, 0, n);
    if (dist(this.x, this.y, this.originX, this.originY) > 40) this.isDead = true;
  }
  show() { fill(this.clr); noStroke(); circle(this.x, this.y, this.d); }
  link() { aetherLink(this.x, this.y, this.d, this.originX, this.originY, 20, 5); }
}

// 6-2. 떨어지는 큰 버블
class FallingBubble {
  constructor(x, y, clr) {
    Object.assign(this, {
      x, y, vx: random(-0.3, 0.3), vy: random(0.5, 1),
      gravity: 0.12, rotation: random(TWO_PI),
      rotationSpeed: random(-0.02, 0.02),
      alpha: 255, r: 20, clr, hasLanded: false,
      fadeSpeed: 1, isDead: false
    });
  }
  run() {
    if (!this.hasLanded) {
      this.x += this.vx; this.y += this.vy; this.vy += this.gravity;
      this.rotation += this.rotationSpeed;
      if (this.y >= height - this.r / 2) this.hasLanded = true;
    } else if ((this.alpha -= this.fadeSpeed) <= 0) this.isDead = true;
    this.show();
  }
  show() {
    push();
    translate(this.x, this.y); rotate(this.rotation);
    fill(red(this.clr), green(this.clr), blue(this.clr), this.alpha);
    noStroke(); ellipse(0, 0, this.r);
    pop();
  }
}

/* ------------- 7. 보조 함수 ------------- */
function easeOutQuint(x) { return 1 - pow(1 - x, 5); }

/* aetherLink()는 메타볼 연결 함수 */
function aetherLink(x1, y1, d1, x2, y2, d2, dst) {
  let r = dst / 2;
  let r1 = d1 / 2;
  let r2 = d2 / 2;
  let R1 = r1 + r;
  let R2 = r2 + r;
  let dx = x2 - x1;
  let dy = y2 - y1;
  let d = sqrt(dx * dx + dy * dy);
  if (d > R1 + R2) return;
  let dirX = dx / d;
  let dirY = dy / d;
  let a = (R1 * R1 - R2 * R2 + d * d) / (2 * d);
  let underRoot = R1 * R1 - a * a;
  if (underRoot < 0) return;
  let h = sqrt(underRoot);
  let midX = x1 + dirX * a;
  let midY = y1 + dirY * a;
  let perpX = -dirY * h;
  let perpY = dirX * h;
  let cx1 = midX + perpX;
  let cy1 = midY + perpY;
  let cx2 = midX - perpX;
  let cy2 = midY - perpY;
  if (dist(cx1, cy1, cx2, cy2) < r * 2) return;
  let ang1 = atan2(y1 - cy1, x1 - cx1);
  let ang2 = atan2(y2 - cy1, x2 - cx1);
  let ang3 = atan2(y2 - cy2, x2 - cx2);
  let ang4 = atan2(y1 - cy2, x1 - cx2);
  if (ang2 < ang1) ang2 += TWO_PI;
  if (ang4 < ang3) ang4 += TWO_PI;

  beginShape();
  for (let t = ang1; t < ang2; t += TWO_PI / 180) {
    vertex(cx1 + r * cos(t), cy1 + r * sin(t));
  }
  for (let t = ang3; t < ang4; t += TWO_PI / 180) {
    vertex(cx2 + r * cos(t), cy2 + r * sin(t));
  }
  endShape(CLOSE);
}

function easeOutQuint(x) {
  return 1 - pow(1 - x, 5);
}
