

/* ========== 전역 상태 ========== */
let surpriseParticles = [];   // 날아오르는 별 파티클
let bangBalloons      = [];   // 느낌표(!) 풍선
let surpriseActive    = false;
let surpriseTimer     = 0;
const SURPRISE_DURATION = 2000; // ms

/* ========== 유틸 ========== */
const easeOutQuad = x => 1 - (1 - x) * (1 - x);

/* ========== API: 애니메이션 시작 ========== */
function triggerSurpriseAnimation(kp) {
  surpriseActive = true;
  surpriseTimer  = millis();
  surpriseParticles = [];
  bangBalloons      = [];

  // 1) 입 벌어진 정도로 파티클 수 결정 (키포인트 13: 하단 입술)
  const mouth = kp[57];
  const center = { x: mouth.x, y: mouth.y };
  const mouthOpen = dist(kp[57].x, kp[57].y, kp[66].x, kp[66].y);
  const burstCount = int(map(constrain(mouthOpen, 4, 30), 4, 30, 8, 40));

  // 별 파티클 생성 (눈썹 기준)
  const browL = kp[21];  // 왼 눈썹
  const browR = kp[22]; // 오 눈썹
  for (let i = 0; i < burstCount; i++) {
    surpriseParticles.push(new StarParticle(browL.x, browL.y));
    surpriseParticles.push(new StarParticle(browR.x, browR.y));
  }

  // 2) 느낌표 풍선 – 머리 위에서 튀어 오름
  const forehead = kp[27];
  bangBalloons.push(new BangBalloon(center.x, center.y, bangImg));
}

/* ========== API: 매 프레임 호출 ========== */
function drawSurprise(kp) {
  if (!surpriseActive) return;
  const elapsed = millis() - surpriseTimer;

  // 파티클
  surpriseParticles = surpriseParticles.filter(p => {
    p.update();
    p.render();
    return !p.dead;
  });

  // 얼굴 중심 재계산
  const center = {
    x: kp[57].x, // 입 중심 (혹은 10번 이마도 가능)
    y: kp[57].y
  };

  // bangBalloons에 매 프레임마다 얼굴 위치 업데이트
  for (let b of bangBalloons) {
    b.updateFacePosition(center.x, center.y);
  }

  bangBalloons = bangBalloons.filter(b => {
    b.run();
    return !b.dead;
  });

  if (elapsed > SURPRISE_DURATION && surpriseParticles.length === 0 && bangBalloons.length === 0) {
    surpriseActive = false;
  }
}

/* ========== 클래스: StarParticle ========== */
class StarParticle {
  constructor(x, y) {
    this.x = x; this.y = y;
    const ang = random(TWO_PI);
    const spd = random(2, 5);
    this.vx = cos(ang) * spd;
    this.vy = sin(ang) * spd - random(1, 3); // 약간 위로
    this.life = 0;
    this.lifeSpan = int(random(40, 70));
    this.size = random(5, 10);
    this.rot = random(TWO_PI);
    this.rotSpd = random(-0.2, 0.2);
    // 파스텔 옐로우 톤으로 고정 – 놀람 빛
    this.col = color(255, 244, 180);
    this.dead = false;
  }
  update() {
    this.life++;
    if (this.life > this.lifeSpan) this.dead = true;
    this.x += this.vx;
    this.y += this.vy;
    this.vy += 0.05; // 천천히 중력
    this.rot += this.rotSpd;
  }
  render() {
    push(); translate(this.x, this.y); rotate(this.rot);
    noStroke(); fill(this.col, map(this.life, 0, this.lifeSpan, 255, 0));
    star(0, 0, this.size * 0.4, this.size, 5);
    pop();
  }
}

/* 별 그리기 helper */
function star(x, y, r1, r2, n) {
  beginShape();
  for (let i = 0; i < n * 2; i++) {
    const a = PI / n * i;
    const r = i % 2 === 0 ? r2 : r1;
    vertex(x + cos(a) * r, y + sin(a) * r);
  }
  endShape(CLOSE);
}

/* ========== 배경등장 ========== */
class BangBalloon {
  constructor(faceCenterX, faceCenterY, img) {
    this.faceX = faceCenterX;
    this.faceY = faceCenterY;
    this.img = img;

    this.w = width;
    this.h = height;

    this.alpha = 255;
    this.fadeSpeed = 3;
    this.dead = false;
  }

  updateFacePosition(x, y) {
    this.faceX = x;
    this.faceY = y;
  }

  run() {
    this.update();
    this.render();
  }

  update() {
    this.alpha -= this.fadeSpeed;
    if (this.alpha <= 0) {
      this.dead = true;
    }
  }

  render() {
    push();
    imageMode(CORNER);

    // 1) 캔버스를 덮기 위한 확대배율
    const scaleFactor = max(width / this.img.width,
                            height / this.img.height);

    // 2) 확대된 이미지 크기
    const drawW = this.img.width  * scaleFactor;
    const drawH = this.img.height * scaleFactor;

    // 3) 얼굴이 이미지 중심이 되도록 좌상단 좌표 보정
    const drawX = this.faceX - drawW / 2;
    const drawY = this.faceY - 40 - drawH / 2 ;

    // 4) 이미지 그리기
    image(this.img, drawX, drawY, drawW, drawH);
    pop();
  }

  get isDead() { return this.alpha <= 0; }
}