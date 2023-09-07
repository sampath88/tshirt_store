const express = require("express");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const app = express();
const fileUpload = require("express-fileupload");

//swagger documentation
const swaggerUi = require("swagger-ui-express");
const YAML = require("yamljs");
const swaggerDocument = YAML.load("./swagger.yaml");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

//regular middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//cookies and file middleware
app.use(cookieParser());
app.use(fileUpload());

//morgan middleware - logger
app.use(morgan("tiny"));

//import all routes here
const home = require("./routes/home.route");

//router middleware
app.use("/api/v1", home);

//export app
module.exports = app;
