// === Fondo animado con líneas doradas que suben ===
// Esto crea un canvas y lo pega al fondo de la página
const canvas = document.createElement('canvas'); // creamos el canvas
document.body.appendChild(canvas);              // lo pegamos al body
const ctx = canvas.getContext('2d');             // y pillamos el contexto 2D

canvas.style.position = 'fixed';                 // que se quede fijo
canvas.style.top = 0;
canvas.style.left = 0;
canvas.style.zIndex = '-1';                      // que no moleste al contenido
canvas.style.pointerEvents = 'none';             // y que no bloquee clics

// Esto hace que el canvas se ajuste al tamaño de pantalla
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();                                   // lo ejecutamos al cargar
window.addEventListener('resize', resizeCanvas);  // y cuando cambie tamaño

let lines = []; // aquí vamos metiendo las líneas que se animan

// Crea una línea con posición, longitud, velocidad y opacidad random
function createLine() {
  return {
    x: Math.random() * canvas.width,             // posición X aleatoria
    y: canvas.height,                            // empieza desde abajo
    length: Math.random() * 150 + 50,            // longitud random
    speed: Math.random() * 2 + 1,                // velocidad random
    alpha: 1                                      // opacidad inicial completa
  };
}

// Dibuja todas las líneas, las mueve y las borra cuando se hacen invisibles
function drawLines() {
  ctx.clearRect(0, 0, canvas.width, canvas.height); // limpiamos todo el canvas

  lines.forEach((line, i) => {
    ctx.strokeStyle = `rgba(212, 175, 55, ${line.alpha})`; // color dorado con transparencia
    ctx.beginPath();
    ctx.moveTo(line.x, line.y);
    ctx.lineTo(line.x, line.y - line.length);
    ctx.stroke();

    line.y -= line.speed;        // la línea sube
    line.alpha -= 0.005;         // se va haciendo invisible

    if (line.alpha <= 0) {
      lines.splice(i, 1);        // si ya no se ve, la quitamos
    }
  });

  // Aleatoriamente se crean nuevas líneas
  if (Math.random() < 0.3) {
    lines.push(createLine());   // con probabilidad de 30%
  }

  requestAnimationFrame(drawLines); // se repite infinitamente como una animación
}

drawLines(); // arranca la animación


// === Mostrar sección de productos al darle al botón ===
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('.btn');                    // pillamos el primer botón con clase .btn
  const propiedadesSection = document.getElementById('propiedades'); // y la sección de productos que está oculta

  btn.addEventListener('click', (e) => {
    e.preventDefault();                                          // que no haga scroll raro
    propiedadesSection.classList.remove('hidden');              // quitamos el hidden para mostrarla
    propiedadesSection.scrollIntoView({ behavior: 'smooth' });  // y bajamos suavemente hacia ella
  });
});
