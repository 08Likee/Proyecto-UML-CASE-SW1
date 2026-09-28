import { generarArchivosSpring } from './generar-archivos-spring';
import type { EspecificacionBackend } from '../models/generacion-backend';

const especificacion: EspecificacionBackend = {
  nombreProyecto: 'Ventas',
  artifactId: 'ventas',
  paqueteBase: 'com.generated.ventas',
  operacionesPendientes: [],
  entidades: [
    {
      nombre: 'Cliente',
      idNombre: 'id',
      idTipoJava: 'Long',
      atributos: [
        { nombre: 'id', tipoJava: 'Long', identificador: true },
        { nombre: 'nombre', tipoJava: 'String', identificador: false },
      ],
      relaciones: [],
    },
    {
      nombre: 'Pedido',
      idNombre: 'id',
      idTipoJava: 'Long',
      atributos: [{ nombre: 'id', tipoJava: 'Long', identificador: true }],
      relaciones: [
        {
          nombreCampo: 'cliente',
          entidadDestino: 'Cliente',
          tipo: 'MANY_TO_ONE',
        },
      ],
    },
  ],
};

describe('generarArchivosSpring', () => {
  it('genera la estructura Spring Boot, CRUD y Postman', () => {
    const archivos = generarArchivosSpring(especificacion);
    const rutas = archivos.map((archivo) => archivo.ruta);
    expect(rutas).toEqual(
      expect.arrayContaining([
        'pom.xml',
        'src/main/resources/application.properties',
        'src/main/java/com/generated/ventas/entity/Cliente.java',
        'src/main/java/com/generated/ventas/repository/ClienteRepository.java',
        'src/main/java/com/generated/ventas/service/ClienteService.java',
        'src/main/java/com/generated/ventas/controller/ClienteController.java',
        'postman/API.postman_collection.json',
      ]),
    );

    const entidad = String(
      archivos.find((archivo) => archivo.ruta.endsWith('/Cliente.java'))!
        .contenido,
    );
    expect(entidad).toContain('@Entity');
    expect(entidad).toContain('@Id');

    const controller = String(
      archivos.find((archivo) =>
        archivo.ruta.endsWith('ClienteController.java'),
      )!.contenido,
    );
    expect(controller).toContain('@GetMapping');
    expect(controller).toContain('@PostMapping');
    expect(controller).toContain('@PutMapping');
    expect(controller).toContain('@DeleteMapping');
  });

  it('genera una relación muchos a uno mediante una FK y sin tabla de unión', () => {
    const archivos = generarArchivosSpring(especificacion);
    const pedido = String(
      archivos.find((archivo) => archivo.ruta.endsWith('/Pedido.java'))!
        .contenido,
    );

    expect(pedido).toContain('@ManyToOne');
    expect(pedido).toContain('@JoinColumn(name = "cliente_id")');
    expect(pedido).toContain('private Cliente cliente;');
    expect(pedido).not.toContain('List<Cliente>');
    expect(pedido).not.toContain('@JoinTable');
  });
});
