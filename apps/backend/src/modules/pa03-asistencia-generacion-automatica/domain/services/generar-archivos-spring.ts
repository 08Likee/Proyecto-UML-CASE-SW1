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
    {
      ruta: 'pom.xml',
      contenido: generarPom(especificacion),
    },
    {
      ruta: `${raizJava}/Application.java`,
      contenido: generarApplication(especificacion.paqueteBase),
    },
    {
      ruta: 'src/main/resources/application.properties',
      contenido: generarProperties(especificacion.artifactId),
    },
    {
      ruta: 'README.md',
      contenido: generarReadme(especificacion),
    },
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

function generarProperties(artifactId: string): string {
  return `spring.application.name=${artifactId}
spring.datasource.url=\${DB_URL:jdbc:postgresql://localhost:5432/${artifactId.replaceAll('-', '_')}}
spring.datasource.username=\${DB_USER:postgres}
spring.datasource.password=\${DB_PASSWORD:postgres}
spring.jpa.hibernate.ddl-auto=update
spring.jpa.open-in-view=false
spring.jpa.properties.hibernate.format_sql=true
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
    if (
      atributo.identificador &&
      ['Integer', 'Long'].includes(atributo.tipoJava)
    ) {
      imports.add('jakarta.persistence.GeneratedValue');
      imports.add('jakarta.persistence.GenerationType');
    }
  }

  for (const relacion of entidad.relaciones) {
    imports.add(`jakarta.persistence.${anotacionRelacion(relacion)}`);
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
        if (['Integer', 'Long'].includes(atributo.tipoJava)) {
          anotaciones.push(
            '  @GeneratedValue(strategy = GenerationType.IDENTITY)',
          );
        }
      }
      return `${anotaciones.join('\n')}${anotaciones.length ? '\n' : ''}  private ${atributo.tipoJava} ${atributo.nombre};`;
    }),
    ...entidad.relaciones.map((relacion) => generarCampoRelacion(relacion)),
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

function generarRepository(paquete: string, entidad: EntidadBackend): string {
  agregarImportTipo(new Set(), entidad.idTipoJava);
  const importId = importTipoJava(entidad.idTipoJava);
  return `package ${paquete}.repository;

import ${paquete}.entity.${entidad.nombre};
${importId ? `import ${importId};\n` : ''}import org.springframework.data.jpa.repository.JpaRepository;

public interface ${entidad.nombre}Repository extends JpaRepository<${entidad.nombre}, ${entidad.idTipoJava}> {}
`;
}

function generarService(paquete: string, entidad: EntidadBackend): string {
  const importId = importTipoJava(entidad.idTipoJava);
  return `package ${paquete}.service;

import ${paquete}.entity.${entidad.nombre};
import ${paquete}.repository.${entidad.nombre}Repository;
${importId ? `import ${importId};\n` : ''}import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class ${entidad.nombre}Service {
  private final ${entidad.nombre}Repository repository;

  public ${entidad.nombre}Service(${entidad.nombre}Repository repository) {
    this.repository = repository;
  }

  public List<${entidad.nombre}> listar() { return repository.findAll(); }

  public ${entidad.nombre} obtener(${entidad.idTipoJava} id) {
    return repository.findById(id)
      .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "${entidad.nombre} no encontrado"));
  }

  public ${entidad.nombre} crear(${entidad.nombre} entidad) { return repository.save(entidad); }

  public ${entidad.nombre} actualizar(${entidad.idTipoJava} id, ${entidad.nombre} entidad) {
    obtener(id);
    entidad.set${capitalizar(entidad.idNombre)}(id);
    return repository.save(entidad);
  }

  public void eliminar(${entidad.idTipoJava} id) {
    obtener(id);
    repository.deleteById(id);
  }
}
`;
}

function generarController(paquete: string, entidad: EntidadBackend): string {
  const importId = importTipoJava(entidad.idTipoJava);
  const recurso = `${entidad.nombre.toLowerCase()}s`;
  return `package ${paquete}.controller;

import ${paquete}.entity.${entidad.nombre};
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
  public List<${entidad.nombre}> listar() { return service.listar(); }

  @GetMapping("/{id}")
  public ${entidad.nombre} obtener(@PathVariable ${entidad.idTipoJava} id) { return service.obtener(id); }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public ${entidad.nombre} crear(@RequestBody ${entidad.nombre} entidad) { return service.crear(entidad); }

  @PutMapping("/{id}")
  public ${entidad.nombre} actualizar(@PathVariable ${entidad.idTipoJava} id, @RequestBody ${entidad.nombre} entidad) {
    return service.actualizar(id, entidad);
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

  return `# ${especificacion.nombreProyecto}

Backend generado automáticamente por la herramienta CASE.

## Requisitos
- Java 21
- Maven 3.9+
- PostgreSQL

## Configuración
Defina DB_URL, DB_USER y DB_PASSWORD o utilice los valores locales por defecto de application.properties.

## Ejecución
\`\`\`bash
mvn spring-boot:run
\`\`\`

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
      const recurso = `${entidad.nombre.toLowerCase()}s`;
      const base = `{{baseUrl}}/api/${recurso}`;
      return {
        name: entidad.nombre,
        item: [
          requestPostman('Listar', 'GET', base),
          requestPostman('Obtener', 'GET', `${base}/1`),
          requestPostman('Crear', 'POST', base, '{}'),
          requestPostman('Actualizar', 'PUT', `${base}/1`, '{}'),
          requestPostman('Eliminar', 'DELETE', `${base}/1`),
        ],
      };
    }),
  };
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

function generarCampoRelacion(relacion: RelacionBackend): string {
  const anotacion = anotacionRelacion(relacion);
  if (esColeccion(relacion)) {
    return `  @${anotacion}\n  private List<${relacion.entidadDestino}> ${relacion.nombreCampo} = new ArrayList<>();`;
  }
  return `  @${anotacion}\n  private ${relacion.entidadDestino} ${relacion.nombreCampo};`;
}

function esColeccion(relacion: RelacionBackend): boolean {
  return relacion.tipo === 'ONE_TO_MANY' || relacion.tipo === 'MANY_TO_MANY';
}

function generarGetterSetter(tipo: string, nombre: string): string {
  const capitalizado = capitalizar(nombre);
  return `  public ${tipo} get${capitalizado}() { return ${nombre}; }\n\n  public void set${capitalizado}(${tipo} ${nombre}) { this.${nombre} = ${nombre}; }\n\n`;
}

function capitalizar(valor: string): string {
  return valor.charAt(0).toUpperCase() + valor.slice(1);
}

function snakeCase(valor: string): string {
  return valor.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}

function escapeXml(valor: string): string {
  return valor
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}
