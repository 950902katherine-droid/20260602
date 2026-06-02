let stars = [];
let missiles = [];
let explosions = [];
const colors = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'];

function setup() {
  createCanvas(windowWidth, windowHeight);
  // 初始化產生 20 顆星星
  for (let i = 0; i < 20; i++) {
    stars.push(new Star());
  }

  // 每隔 3 秒鐘產生一個物件
  setInterval(() => {
    stars.push(new Star());
  }, 3000);
}

function draw() {
  // 淡淡的拖影效果：繪製一個半透明的黑色矩形覆蓋全螢幕
  noStroke();
  fill(0, 40); // 40 是透明度，數值越小拖影越長
  rect(0, 0, width, height);
  
  // 處理爆炸效果
  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].update();
    explosions[i].display();
    if (explosions[i].isDead()) {
      explosions.splice(i, 1);
    }
  }

  // 處理星星
  for (let i = stars.length - 1; i >= 0; i--) {
    stars[i].checkCollision(stars);
    stars[i].update();
    stars[i].display();
  }

  // 處理飛彈
  for (let i = missiles.length - 1; i >= 0; i--) {
    missiles[i].update();
    missiles[i].display();

    // 檢查飛彈是否擊中星星
    for (let j = stars.length - 1; j >= 0; j--) {
      if (missiles[i].hits(stars[j])) {
        // 產生爆炸
        explosions.push(new Explosion(stars[j].pos.x, stars[j].pos.y, stars[j].color));
        // 移除星星與飛彈
        stars.splice(j, 1);
        missiles.splice(i, 1);
        break; // 跳出內層迴圈，因為飛彈已消失
      }
    }

    // 移除超出螢幕的飛彈
    if (missiles[i] && missiles[i].isOffScreen()) {
      missiles.splice(i, 1);
    }
  }

  // 繪製中心箭頭
  drawDoodleArrow();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function mousePressed() {
  // 按下滑鼠左鍵發射飛彈
  let angle = atan2(mouseY - height / 2, mouseX - width / 2);
  missiles.push(new Missile(width / 2, height / 2, angle));
}

function drawDoodleArrow() {
  let angle = atan2(mouseY - height / 2, mouseX - width / 2);
  push();
  translate(width / 2, height / 2);
  rotate(angle);
  
  stroke(255);
  strokeWeight(3);
  noFill();
  
  // 塗鴉風格箭頭：略微不平整的線條
  line(-20, 0, 30, 0); // 箭身
  line(30, 0, 15, -12); // 箭頭上側
  line(30, 0, 15, 12);  // 箭頭下側
  line(-15, -5, -15, 5); // 箭尾裝飾
  pop();
}

class Missile {
  constructor(x, y, angle) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.fromAngle(angle).mult(10);
    this.size = 8;
  }

  update() {
    this.pos.add(this.vel);
  }

  display() {
    push();
    noStroke();
    fill(204, 255, 0); // 螢光黃色
    // 飛彈主體
    ellipse(this.pos.x, this.pos.y, this.size, this.size);
    // 額外的發光效果
    fill(204, 255, 0, 100);
    ellipse(this.pos.x, this.pos.y, this.size * 2, this.size * 2);
    pop();
  }

  hits(star) {
    let d = dist(this.pos.x, this.pos.y, star.pos.x, star.pos.y);
    return d < star.size * 0.5; // 判斷是否碰到星星邊界
  }

  isOffScreen() {
    return (this.pos.x < 0 || this.pos.x > width || this.pos.y < 0 || this.pos.y > height);
  }
}

class Explosion {
  constructor(x, y, col) {
    this.particles = [];
    for (let i = 0; i < 15; i++) {
      this.particles.push(new ExplosionParticle(x, y, col));
    }
  }

  update() {
    for (let p of this.particles) {
      p.update();
    }
  }

  display() {
    for (let p of this.particles) {
      p.display();
    }
  }

  isDead() {
    return this.particles.length === 0 || this.particles.every(p => p.alpha <= 0);
  }
}

class ExplosionParticle {
  constructor(x, y, col) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(2, 6));
    this.alpha = 255;
    this.color = col;
  }

  update() {
    this.pos.add(this.vel);
    this.alpha -= 10;
  }

  display() {
    push();
    noStroke();
    let c = color(this.color);
    fill(red(c), green(c), blue(c), this.alpha);
    ellipse(this.pos.x, this.pos.y, 4, 4);
    pop();
  }
}

class Star {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = p5.Vector.random2D().mult(random(1, 3));
    this.size = random(40, 80);
    this.color = color(random(colors));
    this.isScared = false;
  }

  update() {
    let mouseVec = createVector(mouseX, mouseY);
    let d = dist(this.pos.x, this.pos.y, mouseX, mouseY);

    // 邊界穿透處理
    if (this.pos.x < -this.size) this.pos.x = width + this.size;
    if (this.pos.x > width + this.size) this.pos.x = -this.size;
    if (this.pos.y < -this.size) this.pos.y = height + this.size;
    if (this.pos.y > height + this.size) this.pos.y = -this.size;

    this.handleInteraction(d, mouseVec);
  }

  // 處理與滑鼠的互動
  handleInteraction(d, mouseVec) {
    // 當滑鼠靠近時 (距離小於 150)
    if (d < 150) {
      this.isScared = true;
      // 產生往外跳動的力 (逃離滑鼠)
      let pushForce = p5.Vector.sub(this.pos, mouseVec);
      pushForce.setMag(8);
      this.pos.add(pushForce);
    } else {
      this.isScared = false;
      this.pos.add(this.vel);
    }
  }

  // 粒子間的碰撞處理
  checkCollision(others) {
    for (let other of others) {
      if (other === this) continue;
      let d = dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
      let minDist = (this.size + other.size) * 0.4; // 碰撞半徑判斷
      
      if (d < minDist) {
        // 簡單的速度交換模擬碰撞反彈
        let tempVel = this.vel.copy();
        this.vel = other.vel.copy();
        other.vel = tempVel;

        // 防止粒子重疊卡住，稍微將彼此推開
        let overlap = minDist - d;
        let pushVec = p5.Vector.sub(this.pos, other.pos).setMag(overlap / 2);
        this.pos.add(pushVec);
        other.pos.sub(pushVec);
      }
    }
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    
    // 繪製圓弧星星身體
    noStroke();
    fill(this.color);
    this.drawRoundedStar(0, 0, this.size * 0.4, this.size, 5);

    // 準備繪製眼睛與表情
    let eyeAngle = atan2(mouseY - this.pos.y, mouseX - this.pos.x);
    this.drawFace(eyeAngle);
    
    pop();
  }

  // 使用 curveVertex 繪製圓潤星星
  drawRoundedStar(x, y, radius1, radius2, npoints) {
    let angle = TWO_PI / npoints;
    let halfAngle = angle / 2.0;
    beginShape();
    // 多跑幾次循環以確保 curveVertex 在起點與終點平滑連接
    for (let a = -angle; a < TWO_PI + angle; a += angle) {
      let sx = x + cos(a) * radius2;
      let sy = y + sin(a) * radius2;
      curveVertex(sx, sy);
      let sx2 = x + cos(a + halfAngle) * radius1;
      let sy2 = y + sin(a + halfAngle) * radius1;
      curveVertex(sx2, sy2);
    }
    endShape(CLOSE);
  }

  drawFace(eyeAngle) {
    let eyeDist = this.size * 0.2;
    let eyeY = -this.size * 0.1;
    let eyeSize = this.isScared ? this.size * 0.35 : this.size * 0.25;
    let pupilSize = this.isScared ? eyeSize * 0.7 : eyeSize * 0.5;

    // 繪製左右眼白
    fill(255);
    ellipse(-eyeDist, eyeY, eyeSize, eyeSize);
    ellipse(eyeDist, eyeY, eyeSize, eyeSize);

    // 繪製黑色眼球 (隨滑鼠位置轉動)
    fill(0);
    let lookLimit = this.isScared ? 0 : eyeSize * 0.2; // 驚嚇時眼球放大並居中或稍微偏向
    
    // 左眼球
    push();
    translate(-eyeDist, eyeY);
    ellipse(cos(eyeAngle) * lookLimit, sin(eyeAngle) * lookLimit, pupilSize, pupilSize);
    pop();

    // 右眼球
    push();
    translate(eyeDist, eyeY);
    ellipse(cos(eyeAngle) * lookLimit, sin(eyeAngle) * lookLimit, pupilSize, pupilSize);
    pop();

    // 繪製嘴巴
    noFill();
    stroke(0);
    strokeWeight(2);
    if (this.isScared) {
      // 驚嚇狀：圓形嘴巴
      fill(0);
      ellipse(0, this.size * 0.2, this.size * 0.15, this.size * 0.15);
    } else {
      // 笑臉：圓弧
      arc(0, this.size * 0.15, this.size * 0.25, this.size * 0.2, 0, PI);
    }
  }
}
