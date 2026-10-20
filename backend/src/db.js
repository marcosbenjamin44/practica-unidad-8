require("dotenv").config();
const { Pool } = require("pg");

const cadenaConexion = process.env.DATABASE_URL;

if (!cadenaConexion) {
  console.error("Falta la variable DATABASE_URL. Revise su archivo .env o el panel de Render.");
  process.exit(1);
}

// La URL EXTERNA de Render (la que usa desde su computadora) exige SSL.
// La URL INTERNA (dentro de Render) y la base de GitHub Actions no lo usan.
const usarSSL = cadenaConexion.includes(".render.com") || process.env.DB_SSL === "true";

const pool = new Pool({
  connectionString: cadenaConexion,
  ssl: usarSSL ? { rejectUnauthorized: false } : false
});

// Crea la tabla si no existe y agrega datos de ejemplo la primera vez
async function inicializarBaseDeDatos() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS tareas (
      id          SERIAL PRIMARY KEY,
      titulo      VARCHAR(120) NOT NULL,
      descripcion TEXT,
      completada  BOOLEAN NOT NULL DEFAULT FALSE,
      creada_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const { rows } = await pool.query("SELECT COUNT(*)::int AS total FROM tareas");
  if (rows[0].total === 0) {
    await pool.query(`
      INSERT INTO tareas (titulo, descripcion) VALUES
        ('Instalar Git y Node.js', 'Paso 0 de la practica guiada'),
        ('Subir el proyecto a GitHub', 'Paso 7 de la practica guiada'),
        ('Desplegar el backend en Render', 'Paso 9 de la practica guiada')
    `);
    console.log("Tabla 'tareas' creada con 3 registros de ejemplo.");
  }
}

module.exports = { pool, inicializarBaseDeDatos };