const path = require("path");
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const { pool } = require("./db");

const app = express();

// CORS: solo los dominios listados en ORIGEN_FRONTEND (separados por coma)
const origenesPermitidos = (process.env.ORIGEN_FRONTEND || "")
  .split(",")
  .map((origen) => origen.trim())
  .filter(Boolean);
app.use(cors({ origin: origenesPermitidos }));

app.use(express.json());

// Registro de solicitudes: método, ruta, estado y tiempo. Nunca el cuerpo (contraseñas, tokens).
if (process.env.NODE_ENV !== "test") {
  app.use(morgan("combined"));
}

// Página de prueba en http://localhost:3000/
app.use(express.static(path.join(__dirname, "..", "public")));

// ---------- Utilidades de validación ----------
function validarId(req, res) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ error: "El id debe ser un número entero positivo." });
    return null;
  }
  return id;
}

function validarTarea(datos) {
  const errores = [];
  if (typeof datos.titulo !== "string" || datos.titulo.trim() === "") {
    errores.push("El campo 'titulo' es obligatorio.");
  } else if (datos.titulo.trim().length > 120) {
    errores.push("El campo 'titulo' admite máximo 120 caracteres.");
  }
  if (datos.descripcion !== undefined && datos.descripcion !== null && typeof datos.descripcion !== "string") {
    errores.push("El campo 'descripcion' debe ser texto.");
  }
  if (datos.completada !== undefined && typeof datos.completada !== "boolean") {
    errores.push("El campo 'completada' debe ser true o false.");
  }
  return errores;
}

// ---------- Salud: el proceso responde Y la base de datos contesta ----------
app.get("/salud", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ estado: "ok", baseDeDatos: "conectada", entorno: process.env.NODE_ENV || "desarrollo" });
  } catch (error) {
    console.error("Fallo de salud:", error.message);
    res.status(503).json({ estado: "error", baseDeDatos: "sin conexión" });
  }
});

// ---------- CRUD de la tabla tareas ----------
// Todas las consultas usan parámetros ($1, $2...) para evitar inyección SQL.

app.get("/api/tareas", async (req, res) => {
  try {
    const { rows } = await pool.query("SELECT * FROM tareas ORDER BY id");
    res.json(rows);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "No se pudieron consultar las tareas." });
  }
});

app.get("/api/tareas/:id", async (req, res) => {
  const id = validarId(req, res);
  if (id === null) return;
  try {
    const { rows } = await pool.query("SELECT * FROM tareas WHERE id = $1", [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Tarea no encontrada." });
    res.json(rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "No se pudo consultar la tarea." });
  }
});

app.post("/api/tareas", async (req, res) => {
  const datos = req.body || {};
  const errores = validarTarea(datos);
  if (errores.length > 0) return res.status(400).json({ errores });
  try {
    const { rows } = await pool.query(
      "INSERT INTO tareas (titulo, descripcion, completada) VALUES ($1, $2, $3) RETURNING *",
      [datos.titulo.trim(), datos.descripcion || null, datos.completada ?? false]
    );
    res.status(201).json(rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "No se pudo crear la tarea." });
  }
});

app.put("/api/tareas/:id", async (req, res) => {
  const id = validarId(req, res);
  if (id === null) return;
  const datos = req.body || {};
  const errores = validarTarea(datos);
  if (errores.length > 0) return res.status(400).json({ errores });
  try {
    const { rows } = await pool.query(
      "UPDATE tareas SET titulo = $1, descripcion = $2, completada = $3 WHERE id = $4 RETURNING *",
      [datos.titulo.trim(), datos.descripcion || null, datos.completada ?? false, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "Tarea no encontrada." });
    res.json(rows[0]);
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "No se pudo actualizar la tarea." });
  }
});

app.delete("/api/tareas/:id", async (req, res) => {
  const id = validarId(req, res);
  if (id === null) return;
  try {
    const { rowCount } = await pool.query("DELETE FROM tareas WHERE id = $1", [id]);
    if (rowCount === 0) return res.status(404).json({ error: "Tarea no encontrada." });
    res.status(204).end();
  } catch (error) {
    console.error(error.message);
    res.status(500).json({ error: "No se pudo eliminar la tarea." });
  }
});

// ---------- Rutas inexistentes y errores ----------
app.use((req, res) => {
  res.status(404).json({ error: "Ruta no encontrada." });
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ error: "El cuerpo de la solicitud no es un JSON válido." });
  }
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor." });
});

module.exports = app;