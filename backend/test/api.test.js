require("dotenv").config();
const { test, before, after } = require("node:test");
const assert = require("node:assert");
const request = require("supertest");
const app = require("../src/app");
const { pool, inicializarBaseDeDatos } = require("../src/db");

before(async () => {
  await inicializarBaseDeDatos();
});

after(async () => {
  await pool.end();
});

test("GET /salud responde 200 y confirma la base de datos", async () => {
  const res = await request(app).get("/salud");
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.baseDeDatos, "conectada");
});

test("GET /api/tareas devuelve una lista", async () => {
  const res = await request(app).get("/api/tareas");
  assert.strictEqual(res.status, 200);
  assert.ok(Array.isArray(res.body));
});

test("POST /api/tareas rechaza una tarea sin título", async () => {
  const res = await request(app).post("/api/tareas").send({ descripcion: "sin titulo" });
  assert.strictEqual(res.status, 400);
});

test("GET /api/tareas/abc rechaza un id inválido", async () => {
  const res = await request(app).get("/api/tareas/abc");
  assert.strictEqual(res.status, 400);
});

test("CRUD completo: crear, leer, actualizar y eliminar", async () => {
  const creada = await request(app).post("/api/tareas").send({ titulo: "Tarea de prueba automatizada" });
  assert.strictEqual(creada.status, 201);
  const id = creada.body.id;

  const leida = await request(app).get("/api/tareas/" + id);
  assert.strictEqual(leida.status, 200);
  assert.strictEqual(leida.body.titulo, "Tarea de prueba automatizada");

  const actualizada = await request(app).put("/api/tareas/" + id).send({ titulo: "Tarea actualizada", completada: true });
  assert.strictEqual(actualizada.status, 200);
  assert.strictEqual(actualizada.body.completada, true);

  const eliminada = await request(app).delete("/api/tareas/" + id);
  assert.strictEqual(eliminada.status, 204);

  const yaNoExiste = await request(app).get("/api/tareas/" + id);
  assert.strictEqual(yaNoExiste.status, 404);
});