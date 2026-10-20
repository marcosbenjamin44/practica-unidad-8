require("dotenv").config();
const app = require("./app");
const { inicializarBaseDeDatos } = require("./db");

// Render entrega su propio puerto en process.env.PORT; en su computadora se usa 3000
const PUERTO = process.env.PORT || 3000;

inicializarBaseDeDatos()
  .then(() => {
    app.listen(PUERTO, () => {
      console.log("Servidor escuchando en el puerto " + PUERTO);
    });
  })
  .catch((error) => {
    console.error("No se pudo conectar a la base de datos:", error.message);
    process.exit(1);
  });