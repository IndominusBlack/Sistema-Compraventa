// server.js — Express + Turso remoto y rutas ordenadas “a lo compa”

require('dotenv').config()             // carga variables de .env
const express = require('express')
const cors = require('cors')
const { createClient } = require('@libsql/client')

const app = express()
const PORT = 3000

app.use(cors())                        // permitir peticiones desde el frontend
app.use(express.json())                // parsear JSON en el body

// Conexión a Turso: pon tu URL y TOKEN en .env
const turso = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
})

/* ====== RUTA 1: Listar artículos en venta ====== */
app.get('/articulos', async (req, res) => {
  const page     = parseInt(req.query.page) || 1
  const busqueda = req.query.busqueda || ''
  const estado   = req.query.estado   || ''
  const limit    = 20
  const offset   = (page - 1) * limit

  try {
    // SQL concatenado en un único string ASCII
    const sql =
      "SELECT a.* " +
      "FROM articulo a " +
      "JOIN articulo_venta av ON a.codigo = av.codigo " +
      "WHERE a.nombre LIKE ? " +
      "AND (? = '' OR a.estado = ?) " +
      "ORDER BY a.codigo DESC " +
      "LIMIT ? OFFSET ?;"

    const args = [
      "%" + busqueda + "%",  // 1) LIKE
      estado,                // 2) filtro vacío o ==
      estado,                // 3) valor real
      limit,                 // 4) cuántos
      offset                 // 5) desde dónde
    ]

    // Logs para depurar el SQL exacto y sus parámetros
    console.log("🛠️ Executing SQL:", sql)
    console.log("🛠️ With args    :", args)

    const result = await turso.execute({ sql, args })

    console.log("✅ /articulos returned rows:", result.rows.length)
    res.json(result.rows)
  } catch (err) {
    console.error('ERR /articulos:', err)
    res.status(500).json({ error: err.message })
  }
})



/* ===== RUTA 2: Total de artículos (para paginación) ===== */
app.get('/articulos-total', async (req, res) => {
  try {
    const result = await turso.execute({
      sql: 'SELECT COUNT(*) AS total FROM articulo_venta;'
    })
    res.json(result.rows[0])
  } catch (err) {
    console.error('ERR /articulos-total:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ===== RUTA 3: Detalle de un artículo ===== */
app.get('/articulo/:codigo', async (req, res) => {
  const codigo = req.params.codigo
  try {
    const result = await turso.execute({
      sql: 'SELECT * FROM articulo WHERE codigo = ?;',
      args: [codigo]
    })
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No existe artículo' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('ERR /articulo/:codigo:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ===== RUTA 4: Comprar un artículo ===== */
app.post('/comprar/:codigo', async (req, res) => {
  const codigo_articulo = req.params.codigo
  const codigo_usuario  = req.body.codigo_usuario || 1  // por ahora fijo o viene en body

  try {
    // precio
    const art = await turso.execute({
      sql: 'SELECT precio FROM articulo WHERE codigo = ?;',
      args: [codigo_articulo]
    })
    const precio = art.rows[0]?.precio
    if (!precio) return res.status(404).json({ error: 'Artículo no encontrado' })

    // saldo
    const usr = await turso.execute({
      sql: 'SELECT saldo FROM usuario WHERE codigo = ?;',
      args: [codigo_usuario]
    })
    const saldo = usr.rows[0]?.saldo
    if (saldo < precio) return res.status(400).json({ error: 'Saldo insuficiente' })

    // quitar saldo
    await turso.execute({
      sql: 'UPDATE usuario SET saldo = saldo - ? WHERE codigo = ?;',
      args: [precio, codigo_usuario]
    })

    // borrar de en_venta (si estaba)
    await turso.execute({
      sql: 'DELETE FROM articulo_venta WHERE codigo = ?;',
      args: [codigo_articulo]
    })

    // quitar de deseos (si estaba)
    await turso.execute({
      sql: 'DELETE FROM desea WHERE codigo_usuario = ? AND codigo_articulo = ?;',
      args: [codigo_usuario, codigo_articulo]
    })

    // mover a vendidos
    await turso.execute({
      sql: 'INSERT INTO articulo_vendido (codigo) VALUES (?);',
      args: [codigo_articulo]
    })

    // registrar pago
    await turso.execute({
      sql: 'INSERT INTO registro_pago (codigo_usuario) VALUES (?);',
      args: [codigo_usuario]
    })

    res.json({ success: true, mensaje: 'Compra realizada' })
  } catch (err) {
    console.error('ERR /comprar/:codigo:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ===== RUTA 5: Agregar a lista de deseos ===== */
app.post('/deseos', async (req, res) => {
  const { codigo_usuario, codigo_articulo } = req.body
  try {
    await turso.execute({
      sql: 'INSERT INTO desea (codigo_usuario, codigo_articulo) VALUES (?, ?);',
      args: [codigo_usuario, codigo_articulo]
    })
    res.json({ success: true })
  } catch (err) {
    console.error('ERR /deseos POST:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ===== RUTA 6: Listar deseos de un usuario ===== */
app.get('/deseos/:usuario', async (req, res) => {
  const codigoUsuario = req.params.usuario
  try {
    const result = await turso.execute({
      sql: `
        SELECT a.*
        FROM desea d
        JOIN articulo a ON d.codigo_articulo = a.codigo
        WHERE d.codigo_usuario = ?;
      `,
      args: [codigoUsuario]
    })
    res.json(result.rows)
  } catch (err) {
    console.error('ERR /deseos/:usuario:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ===== RUTA 7: Ingresar dinero (recargar saldo) ===== */
app.post('/ingresar', async (req, res) => {
  const { codigo_usuario, cantidad } = req.body
  try {
    await turso.execute({
      sql: 'UPDATE usuario SET saldo = saldo + ? WHERE codigo = ?;',
      args: [cantidad, codigo_usuario]
    })
    res.json({ success: true })
  } catch (err) {
    console.error('ERR /ingresar POST:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ===== RUTA 8: Obtener saldo de usuario ===== */
app.get('/usuario/:codigo/saldo', async (req, res) => {
  const codigo = req.params.codigo
  try {
    const result = await turso.execute({
      sql: 'SELECT saldo FROM usuario WHERE codigo = ?;',
      args: [codigo]
    })
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'Usuario no existe' })
    }
    res.json(result.rows[0])
  } catch (err) {
    console.error('ERR /usuario/:codigo/saldo:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ===== RUTA 9: Subir un artículo (vender) ===== */
app.post('/vender', async (req, res) => {
  const { nombre, estado, imagen, precio, descripcion, codigo_usuario } = req.body
  try {
    await turso.execute({
      sql: `
        INSERT INTO articulo (nombre, estado, imagen, precio, descripcion, nombre_vendedor)
        VALUES (?, ?, ?, ?, ?, ?);
      `,
      args: [nombre, estado, imagen, precio, descripcion, `User_${codigo_usuario}`]
    })
    // pillamos el nuevo código
    const seq = await turso.execute({
      sql: "SELECT seq AS codigo FROM sqlite_sequence WHERE name='articulo';"
    })
    const newCodigo = seq.rows[0].codigo
    await turso.execute({
      sql: 'INSERT INTO articulo_venta (codigo) VALUES (?);',
      args: [newCodigo]
    })
    res.json({ success: true, codigo: newCodigo })
  } catch (err) {
    console.error('ERR /vender POST:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ===== RUTA 10: Registro de usuario ===== */
app.post('/register', async (req, res) => {
  const { nombre, correo, telefono, password } = req.body
  try {
    // comprobamos si ya existe
    const existe = await turso.execute({
      sql: 'SELECT * FROM usuario WHERE nombre = ?;',
      args: [nombre]
    })
    if (existe.rows.length) {
      return res.status(400).json({ error: 'Ya existe ese usuario' })
    }
    // creamos usuario
    await turso.execute({
      sql: `
        INSERT INTO usuario (nombre, correo, telefono, saldo)
        VALUES (?, ?, ?, 0);
      `,
      args: [nombre, correo, telefono]
    })
    // obtenemos su código
    const resId = await turso.execute({
      sql: "SELECT seq AS codigo FROM sqlite_sequence WHERE name='usuario';"
    })
    res.json({ success: true, codigo_usuario: resId.rows[0].codigo })
  } catch (err) {
    console.error('ERR /register:', err)
    res.status(500).json({ error: err.message })
  }
})

/* ===== RUTA 11: Login ===== */
app.post('/login', async (req, res) => {
  const { nombre, password } = req.body // password sin validar en esta demo
  try {
    const result = await turso.execute({
      sql: 'SELECT codigo, nombre FROM usuario WHERE nombre = ?;',
      args: [nombre]
    })
    if (!result.rows.length) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    res.json({ success: true, usuario: result.rows[0] })
  } catch (err) {
    console.error('ERR /login:', err)
    res.status(500).json({ error: err.message })
  }
})

// arrancamos el servidor
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`)
})

// ===== RUTA EXTRA: Quitar un artículo de deseos =====
app.delete('/deseos/:usuario/:articulo', async (req, res) => {
  const { usuario, articulo } = req.params
  try {
    await turso.execute({
      sql: 'DELETE FROM desea WHERE codigo_usuario = ? AND codigo_articulo = ?;',
      args: [usuario, articulo]
    })
    res.json({ success: true })
  } catch (err) {
    console.error('ERR /deseos DELETE:', err)
    res.status(500).json({ error: err.message })
  }
})
