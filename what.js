/* ───── 전역 ───── */
let whatParticles = [], spreadParticles = [];
let whatStarted = false, spreadStarted = false;
let spreadQueue = [], spreadTimer = 0;
const SPREAD_INTERVAL = 50;

/* ───── 귀 인덱스 헬퍼 ───── */
function getEarIndices(kps){
  return (kps.length > 200)
         ? { right: 454, left: 234 }  // 468-landmark
         : { right: 16,  left: 0   }; // 68-landmark
}

/* ───── 애니메이션 시작 ───── */
function startWhatAnimation(kps){
  const { right, left } = getEarIndices(kps);
  if (!kps[right] || !kps[left]) return;        // 좌표 없으면 중단

  // 상태 초기화
  whatParticles = [];  spreadParticles = [];
  spreadQueue   = [];  spreadTimer = millis();
  whatStarted   = true; spreadStarted = false;

  /* 1) 오른쪽 귀로 흡수되는 입자 80개 */
  const target = { x: kps[right].x, y: kps[right].y };
  for (let i = 0; i < 80; i++){
    const dur   = random(1200, 2500);
    const sx    = random(width - 60, width);
    const sy    = random(0, 60);
    whatParticles.push(new WhatParticle(sx, sy, target, dur));
  }

  /* 2) 왼쪽 귀에서 퍼져나올 대기 입자 60개 */
  const spr = { x: kps[left].x, y: kps[left].y };
  for (let i = 0; i < 60; i++) spreadQueue.push({ x: spr.x, y: spr.y });
}

/* ───── 매 프레임 그리기 ───── */
function drawWhat(kps){
  // (1) 흡수 애니메이션
  for (const p of whatParticles) p.update(), p.show();
  whatParticles = whatParticles.filter(p => !p.isDead);

  // (2) 흡수 끝났으면 퍼짐 단계로 전환
  const { left } = getEarIndices(kps);
  if (whatStarted && !spreadStarted && whatParticles.length === 0 && kps[left]){
    spreadStarted = true;
  }

  // (3) 큐에서 하나씩 꺼내 발사
  if (spreadStarted && spreadQueue.length && millis() - spreadTimer > SPREAD_INTERVAL){
    spreadTimer = millis();
    const s = spreadQueue.shift();
    spreadParticles.push(new WhatParticle(s.x, s.y, null, 0, true));
  }

  // (4) 퍼지는 입자 업데이트
  for (const p of spreadParticles) p.update(), p.show();
  spreadParticles = spreadParticles.filter(p => !p.isDead);
}

/* ───── 입자 클래스 ───── */
class WhatParticle{
  constructor(x, y, target, dur, spread = false){
    this.x = x; this.y = y; this.spread = spread;
    this.isDead = false; this.size = random(2, 5);
    this.col = color(255, 255, 100, 220);

    if (!spread){
      this.sx = x; this.sy = y; this.tx = target.x; this.ty = target.y;
      this.t0 = millis(); this.dur = dur;
    } else {
      this.vx = random(-1.5, -0.5);
      this.vy = random(-0.1, 0.1);
      this.g  = 0.01; this.life = 0; this.maxLife = 120 + random(60);
    }
  }
  update(){
    if (this.spread){
      this.x += this.vx; this.y += this.vy;
      this.vy += this.g; this.life++;
      if (this.life > this.maxLife || this.y > height + 10) this.isDead = true;
    } else {
      const t = constrain((millis() - this.t0) / this.dur, 0, 1);
      this.x = lerp(this.sx, this.tx, t);
      this.y = lerp(this.sy, this.ty, t);
      if (dist(this.x, this.y, this.tx, this.ty) < 5) this.isDead = true;
    }
  }
  show(){
    if (!this.isDead){
      noStroke(); fill(this.col); ellipse(this.x, this.y, this.size);
    }
  }
}
