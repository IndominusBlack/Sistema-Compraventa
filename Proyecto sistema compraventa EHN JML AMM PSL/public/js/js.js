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

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('.propiedades-grid');
  const urlParams = new URLSearchParams(window.location.search);
  const page = urlParams.get('page') || 1;
  const busqueda = urlParams.get('busqueda') || '';
  const estado = urlParams.get('estado') || '';

  fetch(`http://localhost:3000/articulos?page=${page}&busqueda=${busqueda}&estado=${estado}`)
    .then(res => res.json())
    .then(data => {
      grid.innerHTML = ''; // limpiamos el grid
      if (data.length === 0) {
        grid.innerHTML = '<p style="text-align:center">No hay artículos disponibles.</p>';
        return;
      }

      data.forEach(articulo => {
        const card = document.createElement('div');
        card.classList.add('propiedad-card');
        card.innerHTML = `
          <img src="${articulo.imagen}" alt="${articulo.nombre}">
          <h3>${articulo.nombre}</h3>
          <p>${articulo.descripcion}</p>
          <a href="detalle.html?codigo=${articulo.codigo}" class="btn btn-small">Ver detalle</a>
        `;
        grid.appendChild(card); // lo añadimos al HTML
      });
    });
});

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const codigo = params.get('codigo');

  if (!codigo) return;

  fetch(`http://localhost:3000/articulo/${codigo}`)
    .then(res => res.json())
    .then(data => {
      document.querySelector('.detail-title').textContent = data.nombre;
      document.querySelector('.detail-price').textContent = `€${data.precio}`;
      document.querySelector('.detail-state span').textContent = data.estado;
      document.querySelector('.detail-desc').textContent = data.descripcion;
      document.querySelector('.detail-image img').src = data.imagen;
    });
});

document.querySelector('.btn-buy').addEventListener('click', () => {
  const codigo = new URLSearchParams(window.location.search).get('codigo');
  fetch(`http://localhost:3000/comprar/${codigo}`, { method: 'POST' })
    .then(res => res.json())
    .then(data => {
      alert('¡Producto comprado!');
      window.location.href = 'index.html';
    });
});

document.querySelector('.btn-wish').addEventListener('click', () => {
  const codigo = new URLSearchParams(window.location.search).get('codigo');
  fetch(`http://localhost:3000/deseos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ codigo_articulo: codigo, codigo_usuario: 1 }) // Simulado
  }).then(() => alert('Añadido a tu lista de deseos'));
});

document.addEventListener('DOMContentLoaded', () => {
  const grid = document.getElementById('deseos-grid');
  const codigo_usuario = 1; // simulado, más adelante irá por login

  fetch(`http://localhost:3000/deseos/${codigo_usuario}`)
    .then(res => res.json())
    .then(data => {
      if (data.length === 0) {
        grid.innerHTML = '<p style="text-align:center">No tienes artículos en tu lista de deseos.</p>';
        return;
      }

      data.forEach(articulo => {
        const card = document.createElement('div');
        card.classList.add('propiedad-card');
        card.innerHTML = `
          <img src="${articulo.imagen}" alt="${articulo.nombre}">
          <h3>${articulo.nombre}</h3>
          <p>${articulo.descripcion}</p>
          <a href="detalle.html?codigo=${articulo.codigo}" class="btn btn-small">Ver detalle</a>
        `;
        grid.appendChild(card);
      });
    });
});

// Este código va en todas las páginas donde muestres el saldo arriba
document.addEventListener('DOMContentLoaded', () => {
  const saldoSpan = document.getElementById('saldo-usuario'); // esto es donde va el número
  const codigo_usuario = 1; // por ahora, el usuario siempre será el 1

  fetch(`http://localhost:3000/usuario/${codigo_usuario}/saldo`)
    .then(res => res.json())
    .then(data => {
      if (data && data.saldo !== undefined) {
        saldoSpan.textContent = `€${parseFloat(data.saldo).toFixed(2)}`; // pintamos el saldo
      }
    });
});

// Mostrar sección de productos automáticamente si hay parámetros en la URL
document.addEventListener('DOMContentLoaded', () => {
  const grid = document.querySelector('.propiedades-grid');
  const urlParams = new URLSearchParams(window.location.search);
  const page = urlParams.get('page') || 1;
  const busqueda = urlParams.get('busqueda') || '';
  const estado = urlParams.get('estado') || '';

  fetch(`http://localhost:3000/articulos?page=${page}&busqueda=${busqueda}&estado=${estado}`)
    .then(res => res.json())
    .then(data => {
      grid.innerHTML = '';

      if (data.length === 0) {
        grid.innerHTML = '<p style="text-align:center">No hay artículos disponibles.</p>';
        return;
      }

      data.forEach(articulo => {
        const card = document.createElement('div');
        card.classList.add('propiedad-card');
        card.innerHTML = `
          <img src="${articulo.imagen}" alt="${articulo.nombre}">
          <h3>${articulo.nombre}</h3>
          <p>${articulo.descripcion}</p>
          <a href="detalle.html?codigo=${articulo.codigo}" class="btn btn-small">Ver detalle</a>
        `;
        grid.appendChild(card); // añadimos el producto al grid
      });

            const paginaActual = parseInt(urlParams.get('page')) || 1; // página actual
      const paginacion = document.querySelector('.paginacion'); // contenedor

      fetch('http://localhost:3000/articulos-total')
        .then(res => res.json())
        .then(data => {
          const total = data.total;
          const totalPaginas = Math.ceil(total / 20);

          paginacion.innerHTML = ''; // limpiamos

          if (totalPaginas > 1) {
            if (paginaActual > 1) {
              paginacion.innerHTML += `<a href="?page=1" class="btn btn-small">« Primero</a>`;
              paginacion.innerHTML += `<a href="?page=${paginaActual - 1}" class="btn btn-small">‹ Anterior</a>`;
            }

            paginacion.innerHTML += `<span>Página ${paginaActual} de ${totalPaginas}</span>`;

            if (paginaActual < totalPaginas) {
              paginacion.innerHTML += `<a href="?page=${paginaActual + 1}" class="btn btn-small">Siguiente ›</a>`;
              paginacion.innerHTML += `<a href="?page=${totalPaginas}" class="btn btn-small">Última »</a>`;
            }
          }
        });

    });
});

