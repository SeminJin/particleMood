/* ───────── 1. 컬러 페어 ───────── */
const COLOR_PAIR_STRINGS = [
  ['#1800FF', '#FFF34D'], ['#FF008C', '#D9FFF4'],
  ['#FF4D00', '#E7F4FF'], ['#4B0098', '#F4FFE1'],
  ['#005CFF', '#FFD7E8'], ['#003D34', '#FFE94A'],
  ['#8C003E', '#F3E6FF'], ['#003B87', '#FFE8D0'],
  ['#FF6A00', '#E9FFF5'], ['#0019FF', '#FFB4B4']
];

/* ───────── 2. 전역 상태  ───────── */
let happyStates = {};
const PARTICLE_COUNT   = 30;   // 1차 방사형
const BURST_DURATION   = 120;  // 파티클 페이드 길이
const SPLIT_DELAY      = 28;   // frame 이후 2차 폭발
const SPLIT_COUNT      = 12;   // 조각 개수
const SPLIT_SPEED_MIN  = 2.5;
const SPLIT_SPEED_MAX  = 5;

/* ───────── 3. 보조 함수 ───────── */
function easeOutQuint(x){ return 1 - pow(1 - x, 5); }

/* ───────── 4. 클래스 정의 ───────── */
// 4-1) 위습
class Wisp{
  constructor(x,y,originD,r,cStr){
    this.originX=x; this.originY=y;
    this.originD=originD; this.r=r;
    this.timer=0; this.endTime=int(random(30,40));
    this.ang=random(TWO_PI);
    this.x=x; this.y=y; this.d=originD;
    this.colStr=cStr;
  }
  update(){
    this.timer++;
    let n=this.timer/this.endTime;
    // 살짝 회전하면서 이동
    this.ang += 0.05;
    let t=easeOutQuint(n);
    this.x = lerp(this.originX, this.originX + this.r*cos(this.ang), t);
    this.y = lerp(this.originY, this.originY + this.r*sin(this.ang), t);
    this.d = lerp(this.originD, 0, n);
  }
  show(){
    let c=color(this.colStr);
    let alpha=map(this.timer,0,this.endTime,255,0);
    alpha *= 0.6 + 0.4*sin(frameCount*0.9);   // 알파 웨이브
    noStroke();
    fill(red(c),green(c),blue(c),alpha);
    let s = 1+0.2*sin(frameCount*0.2);        // 크기 펄스
    circle(this.x,this.y,this.d*s);
  }
  get isDead(){ return this.timer>this.endTime; }
}
// 4-2) 반짝 스파클
class Sparkle{
  constructor(x,y,cStr){
    this.x=x;this.y=y;this.life=0;
    this.d=random(4,7);this.colStr=cStr;
    this.twinkleSpeed=random(5,9);
  }
  update(){this.life++;}
  show(){
    noStroke();let base=color(this.colStr);
    let alpha=255*abs(sin((frameCount+this.twinkleSpeed)*0.2));
    fill(red(base),green(base),blue(base),alpha);
    circle(this.x,this.y,this.d);
  }
  get isDead(){return this.life>45;}
}

// 4-3) 2차 폭발 Shard
class Shard{
  constructor(x,y,vx,vy,cStr){
    this.x=x;this.y=y;this.vx=vx;this.vy=vy;
    this.life=0;this.d=random(3,5);this.colStr=cStr;
    this.fade=int(random(60,80));
    this.theta = random(TWO_PI);    // 회전 각
    this.spin = random(0.25, 0.55); // 회전 속도
  }
  update(){
    // this.x+=this.vx;this.y+=this.vy;
    this.theta += this.spin;
    this.x += this.vx + sin(this.theta) * 0.9;
    this.y += this.vy + cos(this.theta) * 0.9;

    this.vx*=0.98;this.vy*=0.98;
    this.life++;
  }
  show(){
    noStroke();let c=color(this.colStr);
    let alpha=map(this.life,0,this.fade,255,0);
    fill(red(c),green(c),blue(c),alpha);
    circle(this.x,this.y,this.d);
  }
  get isDead(){return this.life>this.fade;}
}

/* ───────── 5. 메인 위치별 렌더 ───────── */
function drawHappyMulti(index,cx,cy){
  let key=`landmark_${index}`;
  if(!happyStates[key]){
    let cp=random(COLOR_PAIR_STRINGS);
    happyStates[key]={
      initialized:false,
      particles:[], wisps:[],
      sparkles:[], shards:[],
      colors:cp
    };
  }
  let st=happyStates[key];

  /* 5-A. 초기 1차 폭발 */
  if(!st.initialized){
    for(let i=0;i<PARTICLE_COUNT;i++){
      let ang=random(TWO_PI),spd=random(5,8);
      st.particles.push({
      x: cx, y: cy,
      vx: cos(ang) * spd, vy: sin(ang) * spd,
      life: 0, d: 10,
      exploded: false,
      splitDelay: int(random(20, 40)),
      splitCount: int(random(8, 18))
      });
    }
    for(let i=0;i<20;i++){
      let a=random(TWO_PI),r=random(5,20);
      st.sparkles.push(new Sparkle(cx+cos(a)*r,cy+sin(a)*r,st.colors[1]));
    }
    st.initialized=true;
  }

  /* 5-B. 파티클 */
   for (let i = st.particles.length - 1; i >= 0; i--) {
    let p = st.particles[i];
    if (p.prevX !== undefined) {
      stroke(st.colors[0] + '55'); strokeWeight(1);
      line(p.prevX, p.prevY, p.x, p.y);
    }
    p.prevX = p.x; p.prevY = p.y;
    p.x += p.vx; p.y += p.vy; p.life++;

    if (random() < 0.2) {
      let wd = p.d * random(0.6, 1.2);
      let wr = random(40, 120);
      st.wisps.push(new Wisp(p.x, p.y, wd, wr, st.colors[1]));
    }

    if (!p.exploded && p.life > p.splitDelay) {
      p.exploded = true;
      st.particles.splice(i, 1);
      for (let s = 0; s < p.splitCount; s++) {
        let ang = random(TWO_PI);
        let spd = random(SPLIT_SPEED_MIN, SPLIT_SPEED_MAX);
        st.shards.push(new Shard(p.x, p.y, cos(ang) * spd, sin(ang) * spd, st.colors[1]));
      }
      continue;
    }
    noStroke();
    let colP = color(st.colors[0]);
    let alphaP = map(p.life, 0, BURST_DURATION * 1.5, 255, 0);
    fill(red(colP), green(colP), blue(colP), alphaP);
    circle(p.x, p.y, p.d);
  }
     
     
  /* 5-C. Shards */
  for(let i=st.shards.length-1;i>=0;i--){
    let sh=st.shards[i];
    sh.update();sh.show();
    if(sh.isDead) st.shards.splice(i,1);
  }

  /* 5-D. Wisps */
  for(let i=st.wisps.length-1;i>=0;i--){
    let w=st.wisps[i];
    w.update();w.show();
    if(w.isDead) st.wisps.splice(i,1);
  }

  /* 5-E. Sparkles */
  for(let i=st.sparkles.length-1;i>=0;i--){
    let s=st.sparkles[i];
    s.update();s.show();
    if(s.isDead) st.sparkles.splice(i,1);
  }
}

/* ───────── 6. 상태 리셋 ───────── */
function resetHappy(index){ delete happyStates[`landmark_${index}`]; }
