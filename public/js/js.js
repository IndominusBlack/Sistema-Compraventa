// === FONDO ANIMADO ===
const canvas = document.createElement('canvas')
document.body.appendChild(canvas)
const ctx = canvas.getContext('2d')
canvas.style.position = 'fixed'
canvas.style.top = 0; canvas.style.left = 0
canvas.style.zIndex = '-1'; canvas.style.pointerEvents = 'none'

function resizeCanvas() {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
}
resizeCanvas()
window.addEventListener('resize', resizeCanvas)

let lines = []
function createLine() {
  return {
    x: Math.random() * canvas.width,
    y: canvas.height,
    length: Math.random() * 150 + 50,
    speed: Math.random() * 2 + 1,
    alpha: 1
  }
}
function drawLines() {
  ctx.clearRect(0,0,canvas.width,canvas.height)
  lines.forEach((line,i)=> {
    ctx.strokeStyle = `rgba(212,175,55,${line.alpha})`
    ctx.beginPath()
    ctx.moveTo(line.x,line.y)
    ctx.lineTo(line.x,line.y-line.length)
    ctx.stroke()
    line.y -= line.speed
    line.alpha -= 0.005
    if(line.alpha<=0) lines.splice(i,1)
  })
  if(Math.random()<0.3) lines.push(createLine())
  requestAnimationFrame(drawLines)
}
drawLines()

// ruta actual (ej: "index.html", "login.html", etc.)
const page = window.location.pathname.split('/').pop()

// helper para POST JSON
async function postJSON(url, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return res.json()
}

// === GESTIÓN DE SESIÓN: mostrar nombre+saldo o link login ===
document.addEventListener('DOMContentLoaded', () => {
  const userInfo = document.getElementById('usuario-info')
  if (!userInfo) return

  const usuario = JSON.parse(localStorage.getItem('usuario'))
  if (!usuario) {
    userInfo.innerHTML = `<a href="login.html" class="btn btn-small">Login</a>`
    return
  }

  fetch(`http://localhost:3000/usuario/${usuario.codigo}/saldo`)
    .then(r=>r.json())
    .then(d=>{
      const saldo = parseFloat(d.saldo).toFixed(2)
      userInfo.innerHTML = `
        ¡Bienvenido, <strong>${usuario.nombre}</strong>! &nbsp;|&nbsp;
        Saldo: <strong id="saldo-usuario">€${saldo}</strong>
        &nbsp;|&nbsp;<a href="#" id="cerrar-sesion">Cerrar sesión</a>
      `
    })

  // cerrar sesión
  document.body.addEventListener('click', e=>{
    if (e.target.id==='cerrar-sesion') {
      localStorage.removeItem('usuario')
      window.location.href = 'login.html'
    }
  })
})

// === INDEX: productos, filtros y paginación ===
document.addEventListener('DOMContentLoaded', () => {
  if (page !== '' && page !== 'index.html') return

  const grid       = document.querySelector('.propiedades-grid')
  const paginacion = document.querySelector('.paginacion')
  const btnScroll  = document.querySelector('.btn')
  const sección    = document.getElementById('propiedades')
  if(!grid||!paginacion) return

  const params   = new URLSearchParams(window.location.search)
  const p        = parseInt(params.get('page'))||1
  const busqueda = params.get('busqueda')||''
  const estado   = params.get('estado')||''

  if(p||busqueda||estado) sección.classList.remove('hidden')
  btnScroll?.addEventListener('click', e=>{
    e.preventDefault()
    sección.classList.remove('hidden')
    sección.scrollIntoView({behavior:'smooth'})
  })

  fetch(`http://localhost:3000/articulos?page=${p}&busqueda=${busqueda}&estado=${estado}`)
    .then(r=>r.json())
    .then(data=>{
      grid.innerHTML=''
      if(data.length===0) {
        grid.innerHTML='<p style="text-align:center">No hay artículos disponibles.</p>'
        return
      }
      data.forEach(a=>{
        const card = document.createElement('div')
        card.classList.add('propiedad-card')
        const imgHTML = a.imagen
          ? `<img src="${a.imagen}" alt="${a.nombre}">`
          : `<div class="no-image">No hay imagen disponible<br>para este producto</div>`
        card.innerHTML = `
          <div class="propiedad-image">${imgHTML}</div>
          <h3>${a.nombre}</h3>
          <p>${a.descripcion}</p>
          <div class="propiedad-actions">
          <a href="detalle.html?codigo=${a.codigo}" class="btn btn-small">Ver detalle</a>
        </div>
        `

        grid.appendChild(card)
      })

      // Listener botón comprar en index
      document.querySelectorAll('.btn-buy').forEach(btn=>{
        btn.addEventListener('click', async ()=>{
          const codigo = btn.dataset.codigo
          const usuario = JSON.parse(localStorage.getItem('usuario'))
          if(!usuario) {
            alert('Inicia sesión primero')
            return window.location='login.html'
          }
          const data = await postJSON(`http://localhost:3000/comprar/${codigo}`, {
            codigo_usuario: usuario.codigo
          })
          if(data.success) {
            alert('¡Producto comprado!')
            window.location.reload()
          } else {
            alert(data.error||'Error al comprar')
          }
        })
      })

      // paginación
      fetch('http://localhost:3000/articulos-total')
        .then(r=>r.json())
        .then(info=>{
          const total    = info.total
          const tp       = Math.ceil(total/20)
          paginacion.innerHTML=''
          if(tp>1){
            if(p>1){
              paginacion.innerHTML+=`<a href="?page=1&busqueda=${busqueda}&estado=${estado}" class="btn btn-small">« Primero</a>`
              paginacion.innerHTML+=`<a href="?page=${p-1}&busqueda=${busqueda}&estado=${estado}" class="btn btn-small">‹ Anterior</a>`
            }
            paginacion.innerHTML+=`<span>Página ${p} de ${tp}</span>`
            if(p<tp){
              paginacion.innerHTML+=`<a href="?page=${p+1}&busqueda=${busqueda}&estado=${estado}" class="btn btn-small">Siguiente ›</a>`
              paginacion.innerHTML+=`<a href="?page=${tp}&busqueda=${busqueda}&estado=${estado}" class="btn btn-small">Última »</a>`
            }
          }
        })
    })
})

// === DETALLE: mostrar, comprar y deseos ===
document.addEventListener('DOMContentLoaded', () => {
  if (page !== 'detalle.html') return
  const codigo = new URLSearchParams(window.location.search).get('codigo')
  if (!codigo) return

  fetch(`http://localhost:3000/articulo/${codigo}`)
    .then(r=>r.json())
    .then(d=>{
      document.querySelector('.detail-title').textContent      = d.nombre
      document.querySelector('.detail-price').textContent      = `€${d.precio}`
      document.querySelector('.detail-state span').textContent = d.estado
      document.querySelector('.detail-desc').textContent       = d.descripcion
      document.querySelector('.detail-image img').src         = d.imagen
    })

  const usuario = JSON.parse(localStorage.getItem('usuario'))
  document.querySelector('.btn-buy')?.addEventListener('click', async () => {
    if(!usuario) { alert('Inicia sesión primero'); return window.location='login.html' }
    const data = await postJSON(`http://localhost:3000/comprar/${codigo}`, {
      codigo_usuario: usuario.codigo
    })
    if(data.success) {
      alert('¡Comprado!')
      window.location='index.html'
    } else alert(data.error||'Error al comprar')
  })

  document.querySelector('.btn-wish')?.addEventListener('click', async () => {
    const usuario = JSON.parse(localStorage.getItem('usuario'))
    if(!usuario) { alert('Inicia sesión primero'); return window.location='login.html' }
    await postJSON('http://localhost:3000/deseos', {
      codigo_articulo: codigo,
      codigo_usuario: usuario.codigo
    })
    alert('Añadido a deseos')
  })
})

// === LISTA DE DESEOS ===
document.addEventListener('DOMContentLoaded', () => {
  if(page!=='lista-deseos.html') return
  const dg = document.getElementById('deseos-grid')
  if (!dg) return

  const usuario = JSON.parse(localStorage.getItem('usuario'))
  if(!usuario) { dg.innerHTML='<p>Inicia sesión para ver tus deseos</p>'; return }

  fetch(`http://localhost:3000/deseos/${usuario.codigo}`)
    .then(r=>r.json())
    .then(data=>{
      if(data.length===0) {
        dg.innerHTML='<p style="text-align:center">No tienes artículos en tu lista de deseos.</p>'
        return
      }

      data.forEach(a=>{
        const card = document.createElement('div')
        card.classList.add('propiedad-card')
        const imgHTML = a.imagen
          ? `<img src="${a.imagen}" alt="${a.nombre}">`
          : `<div class="no-image">No hay imagen disponible</div>`
        card.innerHTML = `
          ${imgHTML}
          <h3>${a.nombre}</h3>
          <p>${a.descripcion}</p>
          <div class="propiedad-actions">
          <a href="detalle.html?codigo=${a.codigo}" class="btn btn-small">Ver detalle</a>
          <button class="btn btn-small btn-wish-remove" data-codigo="${a.codigo}">✕ Quitar</button>
        </div>
        `

        dg.appendChild(card)
      })

      // comprar desde deseos
      document.querySelectorAll('.btn-buy').forEach(btn=>{
        btn.addEventListener('click', async ()=>{
          const codigo = btn.dataset.codigo
          const data = await postJSON(`http://localhost:3000/comprar/${codigo}`, {
            codigo_usuario: usuario.codigo
          })
          if(data.success) {
            alert('¡Comprado!')
            location.reload()
          } else alert(data.error||'Error al comprar')
        })
      })

      // quitar de deseos
      document.querySelectorAll('.btn-wish-remove').forEach(btn=>{
        btn.addEventListener('click', async ()=>{
          const codigo = btn.dataset.codigo
          await fetch(`http://localhost:3000/deseos/${usuario.codigo}/${codigo}`, {
            method:'DELETE'
          })
          alert('Eliminado de deseos')
          location.reload()
        })
      })
    })
})

// === REGISTER ===
document.addEventListener('DOMContentLoaded', () => {
  if (page !== 'register.html') return
  document.querySelector('form.auth-form')?.addEventListener('submit', async e => {
    e.preventDefault()
    const nombre   = document.getElementById('nombre').value
    const correo   = document.getElementById('correo').value
    const telefono = document.getElementById('telefono').value
    const password = document.getElementById('password').value

    const data = await postJSON('http://localhost:3000/register', {
      nombre, correo, telefono, password
    })

    if (data.success) {
      localStorage.setItem('usuario', JSON.stringify({
        nombre,
        codigo: data.codigo_usuario
      }))
      alert('¡Registro exitoso!')
      window.location = 'index.html'
    } else {
      alert('Error: ' + (data.error || 'Algo falló'))
    }
  })
})

// === LOGIN ===
document.addEventListener('DOMContentLoaded', () => {
  if (page !== 'login.html') return
  document.querySelector('form.auth-form')?.addEventListener('submit', async e => {
    e.preventDefault()
    const nombre   = document.getElementById('nombre').value
    const password = document.getElementById('password').value

    const data = await postJSON('http://localhost:3000/login', { nombre, password })

    if (data.success) {
      localStorage.setItem('usuario', JSON.stringify(data.usuario))
      alert('¡Sesión iniciada!')
      window.location = 'index.html'
    } else {
      alert('Error: ' + (data.error || 'Credenciales inválidas'))
    }
  })
})

// === INGRESAR DINERO (ingresar.html) ===
document.addEventListener('DOMContentLoaded', () => {
  if (page !== 'ingresar.html') return
  const form = document.querySelector('form.auth-form')
  if (!form) return

  form.addEventListener('submit', async e => {
    e.preventDefault()
    const cantidad = parseFloat(document.getElementById('cantidad').value)
    const usuario = JSON.parse(localStorage.getItem('usuario'))
    if (!usuario) {
      alert('Tienes que iniciar sesión antes')
      return window.location = 'login.html'
    }
    const data = await postJSON('http://localhost:3000/ingresar', {
      codigo_usuario: usuario.codigo,
      cantidad
    })
    if (data.success) {
      alert('🪙 Dinero ingresado correctamente')
      const span = document.getElementById('saldo-usuario')
      if (span) span.textContent = `€${(parseFloat(span.textContent.slice(1)) + cantidad).toFixed(2)}`
    } else {
      alert('Error al ingresar dinero: ' + (data.error || 'Desconocido'))
    }
  })
})

// === VENDER ARTÍCULO (vender.html) ===
document.addEventListener('DOMContentLoaded', () => {
  if (page !== 'vender.html') return
  const form = document.querySelector('form.auth-form')
  if (!form) return

  form.addEventListener('submit', async e => {
    e.preventDefault()
    const usuario = JSON.parse(localStorage.getItem('usuario'))
    if (!usuario) {
      alert('Tienes que iniciar sesión para vender')
      return window.location = 'login.html'
    }
    const nombre      = document.getElementById('nombre').value
    const descripcion = document.getElementById('descripcion').value
    const precio      = parseFloat(document.getElementById('precio').value)
    const estado      = document.getElementById('estado').value
    const imagen      = document.getElementById('imagen').value

    const data = await postJSON('http://localhost:3000/vender', {
      nombre, estado, imagen, precio, descripcion, codigo_usuario: usuario.codigo
    })

    if (data.success) {
      alert('Artículo subido con código: ' + data.codigo)
      window.location = 'index.html'
    } else {
      alert('Error subiendo artículo: ' + (data.error || 'Desconocido'))
    }
  })
})
