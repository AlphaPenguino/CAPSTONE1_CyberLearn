// backgroundLines.js
const canvas = document.getElementById("lineCanvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const lines = [];
const total = 60;

for (let i = 0; i < total; i++) {
  lines.push({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    length: 70 + Math.random() * 50,
    speed: 1 + Math.random() * 2,
    color: `rgba(0, 255, 180, ${Math.random() * 0.6 + 0.2})`,
  });
}

function animate() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let line of lines) {
    ctx.beginPath();
    ctx.moveTo(line.x, line.y);
    ctx.lineTo(line.x, line.y - line.length);
    ctx.strokeStyle = line.color;
    ctx.lineWidth = 2;
    ctx.stroke();

    line.y -= line.speed;
    if (line.y < -line.length) {
      line.y = canvas.height;
    }
  }

  requestAnimationFrame(animate);
}

animate();