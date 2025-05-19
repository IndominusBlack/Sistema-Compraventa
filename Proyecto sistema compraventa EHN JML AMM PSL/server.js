require('dotenv').config(); // carga variables del .env (pa no hardcodear datos sensibles)
const express = require('express');
const { createClient } = require('@libsql/client');
const cors = require('cors');

const app = express();
app.use(cors()); // para que el frontend pueda llamar al servidor sin problemas de CORS
app.use(express.json()); // para entender JSON en los requests (POST y compañía)

// conectamos con la base de datos Turso, datos sacados del .env
const turso = createClient({
  url: process.env.TURSO_URL,
  authToken: process.env.TURSO_AUTH_TOKEN
});

// Ruta para pillar artículos (el frontend usa fetch aquí)
app.get('/articulos', async (req, res) => {
  const { page = 1, busqueda = '', estado = '' } = req.query; // si no mandan nada, ponemos defaults
  const limit = 20; // cuánto devolvemos por página
  const offset = (page - 1) * limit; // para paginar bien, saltamos lo que ya vimos

  try {
    const result = await turso.execute({
      sql: `
        SELECT a.*
        FROM articulo a
        JOIN articulo_venta av ON a.codigo = av.codigo
        WHERE a.nombre LIKE ?
          AND (? = '' OR a.estado = ?)
        LIMIT ? OFFSET ?;
      `,
      args: [`%${busqueda}%`, estado, estado, limit, offset]
    });

    res.json(result.rows); // devolvemos los artículos que pillamos
  } catch (err) {
    console.error('ERROR AL CONSULTAR ARTÍCULOS:', err); // si hay error, lo vemos por consola
    res.status(500).json({ error: err.message });
  }
});

// Servidor arrancando en puerto 3000
app.listen(3000, () => {
  console.log('Servidor funcionando en http://localhost:3000'); // avisamos en consola
});

// Ruta para probar la conexión: devuelve todas las tablas que hay en la base
app.get('/test', async (req, res) => {
  try {
    const result = await turso.execute("SELECT name FROM sqlite_master WHERE type='table';");
    res.json(result.rows); // lista con todas las tablas
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Para pillar un artículo por código
app.get('/articulo/:codigo', async (req, res) => {
  try {
    const result = await turso.execute({
      sql: 'SELECT * FROM articulo WHERE codigo = ?',
      args: [req.params.codigo]
    });
    res.json(result.rows[0]); // devuelve solo el primero (porque el código es único)
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ruta para comprar un producto y restar saldo al usuario si puede pagarlo
app.post('/comprar/:codigo', async (req, res) => {
  const codigo_articulo = req.params.codigo; // pillamos el código del artículo que quieren comprar
  const codigo_usuario = 1; // por ahora, el usuario es fijo (más adelante se conecta con login)

  try {
    // 1. Pillamos el precio del artículo
    const articuloRes = await turso.execute({
      sql: 'SELECT precio FROM articulo WHERE codigo = ?',
      args: [codigo_articulo]
    });
    const precio = articuloRes.rows[0]?.precio; // nos quedamos con el número

    if (!precio) {
      return res.status(404).json({ error: 'Artículo no encontrado' }); // si no existe
    }

    // 2. Pillamos el saldo actual del usuario
    const usuarioRes = await turso.execute({
      sql: 'SELECT saldo FROM usuario WHERE codigo = ?',
      args: [codigo_usuario]
    });
    const saldo = usuarioRes.rows[0]?.saldo;

    if (saldo < precio) {
      return res.status(400).json({ error: 'Saldo insuficiente 😢' }); // no tiene pasta
    }

    // 3. Restamos el precio al saldo del usuario
    await turso.execute({
      sql: 'UPDATE usuario SET saldo = saldo - ? WHERE codigo = ?',
      args: [precio, codigo_usuario]
    });

    // 4. Quitamos el artículo de los que están en venta
    await turso.execute({
      sql: 'DELETE FROM articulo_venta WHERE codigo = ?',
      args: [codigo_articulo]
    });

    // 5. Lo metemos como vendido
    await turso.execute({
      sql: 'INSERT INTO articulo_vendido (codigo) VALUES (?)',
      args: [codigo_articulo]
    });

    // 6. Registramos el pago en el historial
    await turso.execute({
      sql: 'INSERT INTO registro_pago (codigo_usuario) VALUES (?)',
      args: [codigo_usuario]
    });

    res.json({ success: true, mensaje: '¡Compra realizada con éxito!' });
  } catch (err) {
    console.error('Error al procesar la compra:', err); // por si algo explota
    res.status(500).json({ error: 'Algo salió mal al comprar el producto' });
  }
});



// Para agregar un artículo a la lista de deseos de un usuario
app.post('/deseos', async (req, res) => {
  const { codigo_usuario, codigo_articulo } = req.body;
  try {
    await turso.execute('INSERT INTO desea (codigo_usuario, codigo_articulo) VALUES (?, ?)', [
      codigo_usuario,
      codigo_articulo
    ]);
    res.json({ success: true }); // éxito al meter en deseos
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/deseos/:usuario', async (req, res) => {
  const codigo_usuario = req.params.usuario;
  try {
    const result = await turso.execute({
      sql: `
        SELECT a.*
        FROM desea d
        JOIN articulo a ON d.codigo_articulo = a.codigo
        WHERE d.codigo_usuario = ?
      `,
      args: [codigo_usuario]        // para añadir artículos a la lista de deseos
    });

    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Ruta para obtener el saldo real de un usuario
app.get('/usuario/:codigo/saldo', async (req, res) => {
  const codigo = req.params.codigo; // pillamos el ID del usuario
  try {
    const result = await turso.execute({
      sql: 'SELECT saldo FROM usuario WHERE codigo = ?', // buscamos el saldo de ese user
      args: [codigo]
    });
    res.json(result.rows[0]); // devolvemos solo el saldo (como objeto)
  } catch (err) {
    res.status(500).json({ error: err.message }); // por si peta
  }
});

// Ruta que devuelve cuántos artículos hay en total (para calcular páginas)
app.get('/articulos-total', async (req, res) => {
  try {
    const result = await turso.execute('SELECT COUNT(*) AS total FROM articulo_venta');
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
