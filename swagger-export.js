const fs = require("fs");
const yaml = require("js-yaml");
const swaggerJsdoc = require("swagger-jsdoc");
const swaggerOptions =
  require("./swagger-api").swaggerOptions || require("./swagger-api");

function ensureDirectoryExists(directory) {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

const exportsDir = "./swagger-exports";
ensureDirectoryExists(exportsDir);


let swaggerSpec;
try {
  if (fs.existsSync("./swagger.json")) {
    const swaggerJson = fs.readFileSync("./swagger.json", "utf8");
    swaggerSpec = JSON.parse(swaggerJson);
    console.log("Using existing swagger.json file");
  } else {
    swaggerSpec = swaggerJsdoc(swaggerOptions);
    console.log("Generated swagger spec from code annotations");
  }
} catch (err) {
  console.error("Error reading or generating swagger spec:", err);
  process.exit(1);
}

function exportSwagger() {
  try {
    fs.writeFileSync(
      `${exportsDir}/openapi3.json`,
      JSON.stringify(swaggerSpec, null, 2)
    );
    console.log("OpenAPI 3.0 JSON exported to swagger-exports/openapi3.json");
  } catch (err) {
    console.error("Error exporting OpenAPI 3.0 JSON:", err);
  }

  try {
    const yamlStr = yaml.dump(swaggerSpec);
    fs.writeFileSync(`${exportsDir}/openapi3.yaml`, yamlStr);
    console.log("OpenAPI 3.0 YAML exported to swagger-exports/openapi3.yaml");
  } catch (err) {
    console.error("Error exporting OpenAPI 3.0 YAML:", err);
  }

  try {
    const swagger2Spec = {
      swagger: "2.0",
      info: swaggerSpec.info,
      host:
        swaggerSpec.servers?.[0]?.url.replace(/https?:\/\//, "") ||
        "localhost:8080",
      basePath: "/",
      schemes: ["http", "https"],
      paths: swaggerSpec.paths,
      definitions: swaggerSpec.components?.schemas || {},
      securityDefinitions: {
        bearerAuth: {
          type: "apiKey",
          name: "Authorization",
          in: "header",
        },
      },
    };

    fs.writeFileSync(
      `${exportsDir}/swagger2.json`,
      JSON.stringify(swagger2Spec, null, 2)
    );
    console.log("Swagger 2.0 JSON exported to swagger-exports/swagger2.json");

    const swagger2Yaml = yaml.dump(swagger2Spec);
    fs.writeFileSync(`${exportsDir}/swagger2.yaml`, swagger2Yaml);
    console.log("Swagger 2.0 YAML exported to swagger-exports/swagger2.yaml");
  } catch (err) {
    console.error("Error exporting Swagger 2.0:", err);
  }
}

// Run export
exportSwagger();
