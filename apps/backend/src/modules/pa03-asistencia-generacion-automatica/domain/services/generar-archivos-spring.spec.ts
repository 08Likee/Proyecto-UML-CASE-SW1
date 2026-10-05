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
          idNombreDestino: 'id',
          idTipoJavaDestino: 'Long',
          tipo: 'MANY_TO_ONE',
          opcional: false,
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
        'src/main/java/com/generated/ventas/dto/ClienteRequest.java',
        'src/main/java/com/generated/ventas/dto/ClienteResponse.java',
        'src/main/java/com/generated/ventas/repository/ClienteRepository.java',
        'src/main/java/com/generated/ventas/service/ClienteService.java',
        'src/main/java/com/generated/ventas/controller/ClienteController.java',
        'src/main/java/com/generated/ventas/config/CorsConfig.java',
        'src/main/java/com/generated/ventas/exception/ApiExceptionHandler.java',
        'postman/API.postman_collection.json',
        'Dockerfile',
        'docker-compose.yml',
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
    expect(controller).toContain('ClienteRequest');
    expect(controller).toContain('ClienteResponse');

    const service = String(
      archivos.find((archivo) => archivo.ruta.endsWith('ClienteService.java'))!
        .contenido,
    );
    expect(service).toContain(
      'public ClienteResponse crear(ClienteRequest request)',
    );
    expect(service).toContain('repository.delete(buscar(id))');

    const postman = JSON.parse(
      String(
        archivos.find((archivo) =>
          archivo.ruta.endsWith('API.postman_collection.json'),
        )!.contenido,
      ),
    ) as {
      item: Array<{
        item: Array<{ name: string; request: { body?: { raw: string } } }>;
      }>;
    };
    const crearCliente = postman.item[0].item.find(
      (item) => item.name === 'Crear',
    );
    expect(crearCliente?.request.body?.raw).toContain('nombre');
  });

  it('genera una relación muchos a uno mediante una FK y sin tabla de unión', () => {
    const archivos = generarArchivosSpring(especificacion);
    const pedido = String(
      archivos.find((archivo) => archivo.ruta.endsWith('/Pedido.java'))!
        .contenido,
    );

    expect(pedido).toContain('@ManyToOne(optional = false)');
    expect(pedido).toContain(
      '@JoinColumn(name = "cliente_id", nullable = false)',
    );
    expect(pedido).toContain('private Cliente cliente;');
    expect(pedido).not.toContain('List<Cliente>');
    expect(pedido).not.toContain('@JoinTable');

    const request = String(
      archivos.find((archivo) => archivo.ruta.endsWith('/PedidoRequest.java'))!
        .contenido,
    );
    expect(request).toContain('Long clienteId');

    const service = String(
      archivos.find((archivo) => archivo.ruta.endsWith('/PedidoService.java'))!
        .contenido,
    );
    expect(service).toContain('ClienteRepository clienteRepository');
    expect(service).toContain('clienteId es obligatorio');
    expect(service).toContain('buscarClienteRelacionado');
  });

  it('genera rutas REST legibles para clases CamelCase y artefactos Docker', () => {
    const detalle: EspecificacionBackend = {
      ...especificacion,
      entidades: [
        {
          nombre: 'DetalleVentaProducto',
          idNombre: 'id',
          idTipoJava: 'Long',
          atributos: [{ nombre: 'id', tipoJava: 'Long', identificador: true }],
          relaciones: [],
        },
      ],
    };
    const archivos = generarArchivosSpring(detalle);
    const controller = String(
      archivos.find((archivo) =>
        archivo.ruta.endsWith('DetalleVentaProductoController.java'),
      )!.contenido,
    );
    expect(controller).toContain(
      '@RequestMapping("/api/detalle-venta-productos")',
    );

    const vendedores: EspecificacionBackend = {
      ...especificacion,
      entidades: [
        {
          nombre: 'Vendedor',
          idNombre: 'id',
          idTipoJava: 'Long',
          atributos: [{ nombre: 'id', tipoJava: 'Long', identificador: true }],
          relaciones: [],
        },
      ],
    };
    const controllerVendedor = String(
      generarArchivosSpring(vendedores).find((archivo) =>
        archivo.ruta.endsWith('VendedorController.java'),
      )!.contenido,
    );
    expect(controllerVendedor).toContain('@RequestMapping("/api/vendedores")');

    const compose = String(
      archivos.find((archivo) => archivo.ruta === 'docker-compose.yml')!
        .contenido,
    );
    expect(compose).toContain('postgres:17-alpine');
    expect(compose).toContain('8080:8080');
  });
});
