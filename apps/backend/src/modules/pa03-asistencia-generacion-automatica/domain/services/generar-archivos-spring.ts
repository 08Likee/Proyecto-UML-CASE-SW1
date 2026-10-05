import type {
  ArchivoGenerado,
  EntidadBackend,
  EspecificacionBackend,
  RelacionBackend,
} from '../models/generacion-backend';

export function generarArchivosSpring(
  especificacion: EspecificacionBackend,
): ArchivoGenerado[] {
  const raizJava = `src/main/java/${especificacion.paqueteBase.replaceAll('.', '/')}`;
  const archivos: ArchivoGenerado[] = [
    { ruta: 'pom.xml', contenido: generarPom(especificacion) },
    {
      ruta: `${raizJava}/Application.java`,
      contenido: generarApplication(especificacion.paqueteBase),
    },
    {
      ruta: `${raizJava}/config/CorsConfig.java`,
      contenido: generarCorsConfig(especificacion.paqueteBase),
    },
    {
      ruta: `${raizJava}/exception/ApiExceptionHandler.java`,
      contenido: generarApiExceptionHandler(especificacion.paqueteBase),
    },
    {
      ruta: 'src/main/resources/application.properties',
      contenido: generarProperties(especificacion.artifactId),
    },
    { ruta: 'Dockerfile', contenido: generarDockerfile() },
    { ruta: '.dockerignore', contenido: generarDockerignore() },
    {
      ruta: 'docker-compose.yml',
      contenido: generarDockerCompose(especificacion.artifactId),
    },
    { ruta: 'README.md', contenido: generarReadme(especificacion) },
    {
      ruta: 'postman/API.postman_collection.json',
      contenido: JSON.stringify(generarPostman(especificacion), null, 2),
    },
  ];

  for (const entidad of especificacion.entidades) {
    archivos.push(
      {
        ruta: `${raizJava}/entity/${entidad.nombre}.java`,
        contenido: generarEntidad(especificacion.paqueteBase, entidad),
      },
      {
        ruta: `${raizJava}/dto/${entidad.nombre}Request.java`,
        contenido: generarRequestDto(especificacion.paqueteBase, entidad),
      },
      {
        ruta: `${raizJava}/dto/${entidad.nombre}Response.java`,
        contenido: generarResponseDto(especificacion.paqueteBase, entidad),
      },
      {
        ruta: `${raizJava}/repository/${entidad.nombre}Repository.java`,
        contenido: generarRepository(especificacion.paqueteBase, entidad),
      },
      {
        ruta: `${raizJava}/service/${entidad.nombre}Service.java`,
        contenido: generarService(especificacion.paqueteBase, entidad),
      },
      {
        ruta: `${raizJava}/controller/${entidad.nombre}Controller.java`,
        contenido: generarController(especificacion.paqueteBase, entidad),
      },
    );
  }

  return archivos;
}

function generarPom(especificacion: EspecificacionBackend): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
  <modelVersion>4.0.0</modelVersion>
  <parent>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-parent</artifactId>
    <version>3.5.6</version>
    <relativePath/>
  </parent>
  <groupId>com.generated</groupId>
  <artifactId>${especificacion.artifactId}</artifactId>
  <version>0.0.1-SNAPSHOT</version>
  <name>${escapeXml(especificacion.nombreProyecto)}</name>
  <properties><java.version>21</java.version></properties>
  <dependencies>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-jpa</artifactId></dependency>
    <dependency><groupId>org.postgresql</groupId><artifactId>postgresql</artifactId><scope>runtime</scope></dependency>
    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-validation</artifactId></dependency>
  </dependencies>
  <build><plugins><plugin><groupId>org.springframework.boot</groupId><artifactId>spring-boot-maven-plugin</artifactId></plugin></plugins></build>
</project>
`;
}

function generarApplication(paquete: string): string {
  return `package ${paquete};

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
  public static void main(String[] args) {
    SpringApplication.run(Application.class, args);
  }
}
`;
}

function generarCorsConfig(paquete: string): string {
  return `package ${paquete}.config;

import java.util.Arrays;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
  private final String[] allowedOrigins;

  public CorsConfig(@Value("\${app.cors.allowed-origins:http://localhost:5173}") String origins) {
    this.allowedOrigins = Arrays.stream(origins.split(","))
      .map(String::trim)
      .filter(value -> !value.isBlank())
      .toArray(String[]::new);
  }

  @Override
  public void addCorsMappings(CorsRegistry registry) {
    registry.addMapping("/api/**")
      .allowedOrigins(allowedOrigins)
      .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
      .allowedHeaders("*");
  }
}
`;
}

function generarApiExceptionHandler(paquete: string): string {
  return `package ${paquete}.exception;

import java.time.OffsetDateTime;
import java.util.Map;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {
  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<Map<String, Object>> conflicto(DataIntegrityViolationException ex) {
    return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
      "status", 409,
      "error", "Conflict",
      "message", "La operación viola una relación o restricción de integridad de datos",
      "timestamp", OffsetDateTime.now().toString()
    ));
  }
}
`;
}

function generarProperties(artifactId: string): string {
  return `spring.application.name=${artifactId}
spring.datasource.url=\${DB_URL:jdbc:postgresql://localhost:5432/${nombreBaseDatos(artifactId)}}
spring.datasource.username=\${DB_USER:postgres}
spring.datasource.password=\${DB_PASSWORD:postgres}
spring.jpa.hibernate.ddl-auto=update
spring.jpa.open-in-view=false
spring.jpa.properties.hibernate.format_sql=true
app.cors.allowed-origins=\${CORS_ALLOWED_ORIGINS:http://localhost:5173}
`;
}

function generarDockerfile(): string {
  return `FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn -q -DskipTests package

FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
`;
}

function generarDockerignore(): string {
  return `target
.git
.idea
.vscode
*.iml
`;
}

function generarDockerCompose(artifactId: string): string {
  const database = nombreBaseDatos(artifactId);
  return `services:
  postgres:
    image: postgres:17-alpine
    environment:
      POSTGRES_DB: ${database}
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - ${database}_pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres -d ${database}"]
      interval: 5s
      timeout: 5s
      retries: 10

  api:
    build: .
    environment:
      DB_URL: jdbc:postgresql://postgres:5432/${database}
      DB_USER: postgres
      DB_PASSWORD: postgres
      CORS_ALLOWED_ORIGINS: http://localhost:5173
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy

volumes:
  ${database}_pgdata:
`;
}

function generarEntidad(paquete: string, entidad: EntidadBackend): string {
  const imports = new Set<string>([
    'jakarta.persistence.Entity',
    'jakarta.persistence.Id',
    'jakarta.persistence.Table',
  ]);

  for (const atributo of entidad.atributos) {
    agregarImportTipo(imports, atributo.tipoJava);
    if (atributo.identificador && idAutogenerado(entidad)) {
      imports.add('jakarta.persistence.GeneratedValue');
      imports.add('jakarta.persistence.GenerationType');
    }
  }

  for (const relacion of entidad.relaciones) {
    imports.add(`jakarta.persistence.${anotacionRelacion(relacion)}`);
    if (relacion.tipo === 'MANY_TO_ONE' || relacion.tipo === 'ONE_TO_ONE') {
      imports.add('jakarta.persistence.JoinColumn');
    }
    if (relacion.tipo === 'ONE_TO_MANY') {
      imports.add('jakarta.persistence.JoinColumn');
    }
    if (relacion.tipo === 'MANY_TO_MANY') {
      imports.add('jakarta.persistence.JoinColumn');
      imports.add('jakarta.persistence.JoinTable');
    }
    if (esColeccion(relacion)) {
      imports.add('java.util.ArrayList');
      imports.add('java.util.List');
    }
  }

  const campos = [
    ...entidad.atributos.map((atributo) => {
      const anotaciones: string[] = [];
      if (atributo.identificador) {
        anotaciones.push('  @Id');
        if (idAutogenerado(entidad)) {
          anotaciones.push(
            '  @GeneratedValue(strategy = GenerationType.IDENTITY)',
          );
        }
      }
      return `${anotaciones.join('\n')}${anotaciones.length ? '\n' : ''}  private ${atributo.tipoJava} ${atributo.nombre};`;
    }),
    ...entidad.relaciones.map((relacion) =>
      generarCampoRelacion(entidad, relacion),
    ),
  ].join('\n\n');

  const accesores = [
    ...entidad.atributos.map((atributo) =>
      generarGetterSetter(atributo.tipoJava, atributo.nombre),
    ),
    ...entidad.relaciones.map((relacion) => {
      const tipo = esColeccion(relacion)
        ? `List<${relacion.entidadDestino}>`
        : relacion.entidadDestino;
      return generarGetterSetter(tipo, relacion.nombreCampo);
    }),
  ].join('\n');

  return `package ${paquete}.entity;

${[...imports]
  .sort()
  .map((valor) => `import ${valor};`)
  .join('\n')}

@Entity
@Table(name = "${snakeCase(entidad.nombre)}")
public class ${entidad.nombre} {

${campos}

  public ${entidad.nombre}() {}

${accesores}}
`;
}

function generarRequestDto(paquete: string, entidad: EntidadBackend): string {
  const campos = camposRequest(entidad);
  const imports = importsCampos(campos);
  return `package ${paquete}.dto;

${imports.length ? `${imports.map((valor) => `import ${valor};`).join('\n')}\n\n` : ''}public record ${entidad.nombre}Request(
${formatearCamposRecord(campos)}
) {}
`;
}

function generarResponseDto(paquete: string, entidad: EntidadBackend): string {
  const campos = camposResponse(entidad);
  const imports = importsCampos(campos);
  return `package ${paquete}.dto;

${imports.length ? `${imports.map((valor) => `import ${valor};`).join('\n')}\n\n` : ''}public record ${entidad.nombre}Response(
${formatearCamposRecord(campos)}
) {}
`;
}

interface CampoDto {
  tipo: string;
  nombre: string;
}

function camposRequest(entidad: EntidadBackend): CampoDto[] {
  const atributos = entidad.atributos
    .filter((atributo) => !atributo.identificador || !idAutogenerado(entidad))
    .map((atributo) => ({
      tipo: atributo.tipoJava,
      nombre: atributo.nombre,
    }));

  return [
    ...atributos,
    ...entidad.relaciones.map((relacion) => ({
      tipo: esColeccion(relacion)
        ? `List<${relacion.idTipoJavaDestino}>`
        : relacion.idTipoJavaDestino,
      nombre: nombreIdRelacion(relacion),
    })),
  ];
}

function camposResponse(entidad: EntidadBackend): CampoDto[] {
  return [
    ...entidad.atributos.map((atributo) => ({
      tipo: atributo.tipoJava,
      nombre: atributo.nombre,
    })),
    ...entidad.relaciones.map((relacion) => ({
      tipo: esColeccion(relacion)
        ? `List<${relacion.idTipoJavaDestino}>`
        : relacion.idTipoJavaDestino,
      nombre: nombreIdRelacion(relacion),
    })),
  ];
}

function importsCampos(campos: CampoDto[]): string[] {
  const imports = new Set<string>();
  for (const campo of campos) {
    if (campo.tipo.startsWith('List<')) {
      imports.add('java.util.List');
      const interior = campo.tipo.slice(5, -1);
      agregarImportTipo(imports, interior);
    } else {
      agregarImportTipo(imports, campo.tipo);
    }
  }
  return [...imports].sort();
}

function formatearCamposRecord(campos: CampoDto[]): string {
  if (campos.length === 0) return '';
  return campos
    .map(
      (campo, indice) =>
        `  ${campo.tipo} ${campo.nombre}${indice < campos.length - 1 ? ',' : ''}`,
    )
    .join('\n');
}

function generarRepository(paquete: string, entidad: EntidadBackend): string {
  const importId = importTipoJava(entidad.idTipoJava);
  return `package ${paquete}.repository;

import ${paquete}.entity.${entidad.nombre};
${importId ? `import ${importId};\n` : ''}import org.springframework.data.jpa.repository.JpaRepository;

public interface ${entidad.nombre}Repository extends JpaRepository<${entidad.nombre}, ${entidad.idTipoJava}> {}
`;
}

function generarService(paquete: string, entidad: EntidadBackend): string {
  const relacionesDestino = relacionesDestinoUnicas(entidad);
  const imports = new Set<string>([
    `${paquete}.dto.${entidad.nombre}Request`,
    `${paquete}.dto.${entidad.nombre}Response`,
    `${paquete}.entity.${entidad.nombre}`,
    `${paquete}.repository.${entidad.nombre}Repository`,
    'java.util.List',
    'org.springframework.http.HttpStatus',
    'org.springframework.stereotype.Service',
    'org.springframework.transaction.annotation.Transactional',
    'org.springframework.web.server.ResponseStatusException',
  ]);

  agregarImportTipo(imports, entidad.idTipoJava);
  for (const relacion of relacionesDestino) {
    agregarImportTipo(imports, relacion.idTipoJavaDestino);
    if (relacion.entidadDestino !== entidad.nombre) {
      imports.add(`${paquete}.entity.${relacion.entidadDestino}`);
      imports.add(`${paquete}.repository.${relacion.entidadDestino}Repository`);
    }
  }
  if (entidad.relaciones.some(esColeccion)) {
    imports.add('java.util.ArrayList');
    imports.add('java.util.stream.Collectors');
  }

  const repositoriosRelacion = relacionesDestino
    .filter((relacion) => relacion.entidadDestino !== entidad.nombre)
    .map(
      (relacion) =>
        `  private final ${relacion.entidadDestino}Repository ${nombreRepositorioRelacion(relacion)};`,
    );

  const parametrosConstructor = [
    `${entidad.nombre}Repository repository`,
    ...relacionesDestino
      .filter((relacion) => relacion.entidadDestino !== entidad.nombre)
      .map(
        (relacion) =>
          `${relacion.entidadDestino}Repository ${nombreRepositorioRelacion(relacion)}`,
      ),
  ];

  const asignacionesConstructor = [
    '    this.repository = repository;',
    ...relacionesDestino
      .filter((relacion) => relacion.entidadDestino !== entidad.nombre)
      .map(
        (relacion) =>
          `    this.${nombreRepositorioRelacion(relacion)} = ${nombreRepositorioRelacion(relacion)};`,
      ),
  ];

  const idNoGenerado = !idAutogenerado(entidad)
    ? `    if (request.${entidad.idNombre}() == null) {\n      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "${entidad.idNombre} es obligatorio");\n    }\n    entity.set${capitalizar(entidad.idNombre)}(request.${entidad.idNombre}());\n`
    : '';

  const settersAtributos = entidad.atributos
    .filter((atributo) => !atributo.identificador)
    .map(
      (atributo) =>
        `    entity.set${capitalizar(atributo.nombre)}(request.${atributo.nombre}());`,
    );
  const settersRelaciones = entidad.relaciones.map((relacion) =>
    generarAsignacionRelacion(relacion),
  );

  const valoresResponse = [
    ...entidad.atributos.map(
      (atributo) => `      entity.get${capitalizar(atributo.nombre)}()`,
    ),
    ...entidad.relaciones.map((relacion) =>
      generarValorResponseRelacion(relacion),
    ),
  ];

  const buscadoresRelacion = relacionesDestino.map((relacion) =>
    generarBuscadorRelacion(entidad, relacion),
  );

  return `package ${paquete}.service;

${[...imports]
  .sort()
  .map((valor) => `import ${valor};`)
  .join('\n')}

@Service
public class ${entidad.nombre}Service {
  private final ${entidad.nombre}Repository repository;
${repositoriosRelacion.length ? `${repositoriosRelacion.join('\n')}\n` : ''}
  public ${entidad.nombre}Service(
${parametrosConstructor.map((parametro) => `    ${parametro}`).join(',\n')}
  ) {
${asignacionesConstructor.join('\n')}
  }

  @Transactional(readOnly = true)
  public List<${entidad.nombre}Response> listar() {
    return repository.findAll().stream().map(this::toResponse).toList();
  }

  @Transactional(readOnly = true)
  public ${entidad.nombre}Response obtener(${entidad.idTipoJava} id) {
    return toResponse(buscar(id));
  }

  @Transactional
  public ${entidad.nombre}Response crear(${entidad.nombre}Request request) {
    ${entidad.nombre} entity = new ${entidad.nombre}();
${idNoGenerado}    aplicar(entity, request);
    return toResponse(repository.save(entity));
  }

  @Transactional
  public ${entidad.nombre}Response actualizar(${entidad.idTipoJava} id, ${entidad.nombre}Request request) {
    ${entidad.nombre} entity = buscar(id);
    aplicar(entity, request);
    return toResponse(repository.save(entity));
  }

  @Transactional
  public void eliminar(${entidad.idTipoJava} id) {
    repository.delete(buscar(id));
  }

  private ${entidad.nombre} buscar(${entidad.idTipoJava} id) {
    return repository.findById(id)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "${entidad.nombre} no encontrado"));
  }

  private void aplicar(${entidad.nombre} entity, ${entidad.nombre}Request request) {
${[...settersAtributos, ...settersRelaciones].join('\n') || '    // La entidad solo contiene su identificador.'}
  }

  private ${entidad.nombre}Response toResponse(${entidad.nombre} entity) {
    return new ${entidad.nombre}Response(
${valoresResponse.map((valor, indice) => `${valor}${indice < valoresResponse.length - 1 ? ',' : ''}`).join('\n')}
    );
  }
${buscadoresRelacion.length ? `\n${buscadoresRelacion.join('\n\n')}\n` : ''}}
`;
}

function relacionesDestinoUnicas(entidad: EntidadBackend): RelacionBackend[] {
  const porDestino = new Map<string, RelacionBackend>();
  for (const relacion of entidad.relaciones) {
    if (!porDestino.has(relacion.entidadDestino)) {
      porDestino.set(relacion.entidadDestino, relacion);
    }
  }
  return [...porDestino.values()];
}

function generarAsignacionRelacion(relacion: RelacionBackend): string {
  const setter = `entity.set${capitalizar(relacion.nombreCampo)}`;
  const accessor = `request.${nombreIdRelacion(relacion)}()`;
  if (esColeccion(relacion)) {
    return `    ${setter}(${accessor} == null\n      ? new ArrayList<>()\n      : ${accessor}.stream()\n        .map(this::${nombreBuscadorRelacion(relacion)})\n        .collect(Collectors.toCollection(ArrayList::new)));`;
  }

  if (relacion.opcional) {
    return `    ${setter}(${accessor} == null ? null : ${nombreBuscadorRelacion(relacion)}(${accessor}));`;
  }

  return `    if (${accessor} == null) {\n      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "${nombreIdRelacion(relacion)} es obligatorio");\n    }\n    ${setter}(${nombreBuscadorRelacion(relacion)}(${accessor}));`;
}

function generarValorResponseRelacion(relacion: RelacionBackend): string {
  const getter = `entity.get${capitalizar(relacion.nombreCampo)}()`;
  const getterId = `get${capitalizar(relacion.idNombreDestino)}()`;
  if (esColeccion(relacion)) {
    return `      ${getter}.stream().map(item -> item.${getterId}).toList()`;
  }
  return `      ${getter} == null ? null : ${getter}.${getterId}`;
}

function generarBuscadorRelacion(
  entidad: EntidadBackend,
  relacion: RelacionBackend,
): string {
  const repositorio =
    relacion.entidadDestino === entidad.nombre
      ? 'repository'
      : nombreRepositorioRelacion(relacion);
  return `  private ${relacion.entidadDestino} ${nombreBuscadorRelacion(relacion)}(${relacion.idTipoJavaDestino} id) {
    return ${repositorio}.findById(id)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "${relacion.entidadDestino} relacionado no encontrado"));
  }`;
}

function nombreRepositorioRelacion(relacion: RelacionBackend): string {
  return `${minusculaInicial(relacion.entidadDestino)}Repository`;
}

function nombreBuscadorRelacion(relacion: RelacionBackend): string {
  return `buscar${relacion.entidadDestino}Relacionado`;
}

function generarController(paquete: string, entidad: EntidadBackend): string {
  const importId = importTipoJava(entidad.idTipoJava);
  const recurso = recursoApi(entidad.nombre);
  return `package ${paquete}.controller;

import ${paquete}.dto.${entidad.nombre}Request;
import ${paquete}.dto.${entidad.nombre}Response;
import ${paquete}.service.${entidad.nombre}Service;
${importId ? `import ${importId};\n` : ''}import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/${recurso}")
public class ${entidad.nombre}Controller {
  private final ${entidad.nombre}Service service;

  public ${entidad.nombre}Controller(${entidad.nombre}Service service) { this.service = service; }

  @GetMapping
  public List<${entidad.nombre}Response> listar() { return service.listar(); }

  @GetMapping("/{id}")
  public ${entidad.nombre}Response obtener(@PathVariable ${entidad.idTipoJava} id) { return service.obtener(id); }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ${entidad.nombre}Response crear(@RequestBody ${entidad.nombre}Request request) { return service.crear(request); }

  @PutMapping("/{id}")
  public ${entidad.nombre}Response actualizar(@PathVariable ${entidad.idTipoJava} id, @RequestBody ${entidad.nombre}Request request) {
    return service.actualizar(id, request);
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void eliminar(@PathVariable ${entidad.idTipoJava} id) { service.eliminar(id); }
}
`;
}

function generarReadme(especificacion: EspecificacionBackend): string {
  const pendientes = especificacion.operacionesPendientes.length
    ? especificacion.operacionesPendientes
        .map(
          (operacion) =>
            `- ${operacion.clase}.${operacion.firma}: ${operacion.motivo}`,
        )
        .join('\n')
    : '- Ninguna.';
  const endpoints = especificacion.entidades
    .map(
      (entidad) =>
        `- \`/api/${recursoApi(entidad.nombre)}\` — CRUD de ${entidad.nombre}`,
    )
    .join('\n');

  return `# ${especificacion.nombreProyecto}

Backend generado automáticamente por la herramienta CASE.

## Stack
- Java 21
- Spring Boot 3.5
- Spring Web
- Spring Data JPA / Hibernate
- PostgreSQL
- Maven

## CRUD generado
Cada clase UML persistente genera Entity, DTO Request/Response, Repository, Service y Controller con operaciones Crear, Listar, Obtener por ID, Actualizar y Eliminar.

${endpoints}

Las claves foráneas y tablas de unión se derivan de las relaciones UML; no deben duplicarse como atributos manuales del modelo conceptual.

## Relaciones en la API
Las referencias se envían mediante identificadores. Por ejemplo, una relación \`cliente\` se representa en el JSON como \`clienteId\`. Las colecciones se representan como \`<relacion>Ids\`.

## Ejecución recomendada con Docker
Requiere Docker Desktop / Docker Engine:

\`\`\`bash
docker compose up --build
\`\`\`

API: \`http://localhost:8080\`.

Para detener conservando los datos:

\`\`\`bash
docker compose down
\`\`\`

Para borrar también el volumen de PostgreSQL:

\`\`\`bash
docker compose down -v
\`\`\`

## Ejecución local con Maven
Requisitos: Java 21, Maven 3.9+ y PostgreSQL.

Defina DB_URL, DB_USER y DB_PASSWORD o utilice los valores locales por defecto de application.properties.

\`\`\`bash
mvn spring-boot:run
\`\`\`

CORS permite por defecto \`http://localhost:5173\`. Puede cambiarse mediante \`CORS_ALLOWED_ORIGINS\`.

## Postman
Importe \`postman/API.postman_collection.json\`. La colección incluye los cinco endpoints CRUD por entidad y cuerpos de ejemplo coherentes con los tipos y relaciones generadas.

## Operaciones UML pendientes de implementación
${pendientes}

Estas operaciones no bloquean el CRUD estructural generado. Su regla de negocio debe ser definida antes de incorporarlas al artefacto final.
`;
}

function generarPostman(especificacion: EspecificacionBackend): object {
  return {
    info: {
      name: `${especificacion.nombreProyecto} API`,
      schema:
        'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
    },
    variable: [{ key: 'baseUrl', value: 'http://localhost:8080' }],
    item: especificacion.entidades.map((entidad) => {
      const base = `{{baseUrl}}/api/${recursoApi(entidad.nombre)}`;
      const idEjemplo = String(ejemploTipo(entidad.idTipoJava));
      const body = JSON.stringify(generarEjemploRequest(entidad), null, 2);
      return {
        name: entidad.nombre,
        item: [
          requestPostman('Listar', 'GET', base),
          requestPostman('Obtener', 'GET', `${base}/${idEjemplo}`),
          requestPostman('Crear', 'POST', base, body),
          requestPostman('Actualizar', 'PUT', `${base}/${idEjemplo}`, body),
          requestPostman('Eliminar', 'DELETE', `${base}/${idEjemplo}`),
        ],
      };
    }),
  };
}

function generarEjemploRequest(
  entidad: EntidadBackend,
): Record<string, unknown> {
  const resultado: Record<string, unknown> = {};
  for (const atributo of entidad.atributos) {
    if (atributo.identificador && idAutogenerado(entidad)) continue;
    resultado[atributo.nombre] = ejemploTipo(atributo.tipoJava);
  }
  for (const relacion of entidad.relaciones) {
    const ejemplo = ejemploTipo(relacion.idTipoJavaDestino);
    resultado[nombreIdRelacion(relacion)] = esColeccion(relacion)
      ? [ejemplo]
      : ejemplo;
  }
  return resultado;
}

function ejemploTipo(tipo: string): unknown {
  const ejemplos: Record<string, unknown> = {
    String: 'ejemplo',
    Integer: 1,
    Long: 1,
    Double: 10.5,
    Float: 10.5,
    BigDecimal: 10.5,
    Boolean: true,
    LocalDate: '2026-01-01',
    LocalDateTime: '2026-01-01T12:00:00',
    UUID: '00000000-0000-4000-8000-000000000001',
  };
  return ejemplos[tipo] ?? null;
}

function requestPostman(
  name: string,
  method: string,
  raw: string,
  body?: string,
): object {
  return {
    name,
    request: {
      method,
      header: body ? [{ key: 'Content-Type', value: 'application/json' }] : [],
      ...(body
        ? {
            body: {
              mode: 'raw',
              raw: body,
              options: { raw: { language: 'json' } },
            },
          }
        : {}),
      url: { raw },
    },
  };
}

function agregarImportTipo(imports: Set<string>, tipo: string): void {
  const valor = importTipoJava(tipo);
  if (valor) imports.add(valor);
}

function importTipoJava(tipo: string): string | null {
  const imports: Record<string, string> = {
    BigDecimal: 'java.math.BigDecimal',
    LocalDate: 'java.time.LocalDate',
    LocalDateTime: 'java.time.LocalDateTime',
    UUID: 'java.util.UUID',
  };
  return imports[tipo] ?? null;
}

function anotacionRelacion(relacion: RelacionBackend): string {
  const mapa = {
    ONE_TO_ONE: 'OneToOne',
    ONE_TO_MANY: 'OneToMany',
    MANY_TO_ONE: 'ManyToOne',
    MANY_TO_MANY: 'ManyToMany',
  } as const;
  return mapa[relacion.tipo];
}

function generarCampoRelacion(
  entidad: EntidadBackend,
  relacion: RelacionBackend,
): string {
  const anotacion = anotacionRelacion(relacion);

  if (relacion.tipo === 'MANY_TO_ONE' || relacion.tipo === 'ONE_TO_ONE') {
    const optional = relacion.opcional ? '' : '(optional = false)';
    const nullable = relacion.opcional ? '' : ', nullable = false';
    return `  @${anotacion}${optional}\n  @JoinColumn(name = "${snakeCase(relacion.nombreCampo)}_id"${nullable})\n  private ${relacion.entidadDestino} ${relacion.nombreCampo};`;
  }

  if (relacion.tipo === 'MANY_TO_MANY') {
    return `  @${anotacion}\n  @JoinTable(\n    name = "${snakeCase(entidad.nombre)}_${snakeCase(relacion.entidadDestino)}",\n    joinColumns = @JoinColumn(name = "${snakeCase(entidad.nombre)}_id"),\n    inverseJoinColumns = @JoinColumn(name = "${snakeCase(relacion.entidadDestino)}_id")\n  )\n  private List<${relacion.entidadDestino}> ${relacion.nombreCampo} = new ArrayList<>();`;
  }

  return `  @${anotacion}\n  @JoinColumn(name = "${snakeCase(entidad.nombre)}_id")\n  private List<${relacion.entidadDestino}> ${relacion.nombreCampo} = new ArrayList<>();`;
}

function esColeccion(relacion: RelacionBackend): boolean {
  return relacion.tipo === 'ONE_TO_MANY' || relacion.tipo === 'MANY_TO_MANY';
}

function nombreIdRelacion(relacion: RelacionBackend): string {
  return `${relacion.nombreCampo}${esColeccion(relacion) ? 'Ids' : 'Id'}`;
}

function idAutogenerado(entidad: EntidadBackend): boolean {
  return ['Integer', 'Long'].includes(entidad.idTipoJava);
}

function generarGetterSetter(tipo: string, nombre: string): string {
  const capitalizado = capitalizar(nombre);
  return `  public ${tipo} get${capitalizado}() { return ${nombre}; }\n\n  public void set${capitalizado}(${tipo} ${nombre}) { this.${nombre} = ${nombre}; }\n\n`;
}

function capitalizar(valor: string): string {
  return valor.charAt(0).toUpperCase() + valor.slice(1);
}

function minusculaInicial(valor: string): string {
  return valor.charAt(0).toLowerCase() + valor.slice(1);
}

function snakeCase(valor: string): string {
  return valor.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function recursoApi(valor: string): string {
  const partes = valor
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .split('-')
    .filter(Boolean);
  const ultimo = partes.pop() ?? 'recursos';
  partes.push(pluralizarRecurso(ultimo));
  return partes.join('-');
}

function pluralizarRecurso(valor: string): string {
  if (valor.endsWith('s')) return valor;
  if (valor.endsWith('z')) return `${valor.slice(0, -1)}ces`;
  return /[aeiou]$/.test(valor) ? `${valor}s` : `${valor}es`;
}

function nombreBaseDatos(artifactId: string): string {
  return artifactId.replaceAll('-', '_');
}

function escapeXml(valor: string): string {
  return valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
