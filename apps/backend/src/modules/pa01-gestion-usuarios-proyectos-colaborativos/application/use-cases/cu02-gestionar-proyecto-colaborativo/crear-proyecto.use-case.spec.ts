import {
  type CrearProyectoConAnfitrionDatos,
  type CrearProyectoConAnfitrionResultado,
  ProyectoRepository,
} from '../../../domain/repositories/proyecto.repository';
import { CrearProyectoUseCase } from './crear-proyecto.use-case';

class ProyectoRepositoryFake extends ProyectoRepository {
  datos: CrearProyectoConAnfitrionDatos | null = null;

  async crearConAnfitrion(
    datos: CrearProyectoConAnfitrionDatos,
  ): Promise<CrearProyectoConAnfitrionResultado> {
    this.datos = datos;

    const ahora = new Date();

    return {
      proyecto: {
        id: 'proyecto-1',
        nombre: datos.nombre,
        descripcion: datos.descripcion,
        fechaCreacion: ahora,
        estado: 'ACTIVO',
        configuracion: datos.configuracion,
        fechaActualizacion: ahora,
      },
      rolAnfitrion: {
        id: 'rol-1',
        nombre: 'Anfitrión',
        descripcion: null,
        esPredeterminado: true,
        estado: 'ACTIVO',
        fechaCreacion: ahora,
        fechaActualizacion: ahora,
        idProyecto: 'proyecto-1',
      },
      membresia: {
        id: 'membresia-1',
        fechaUnion: ahora,
        estado: 'ACTIVA',
        fechaUltimaActividad: null,
        idUsuario: datos.idUsuario,
        idProyecto: 'proyecto-1',
        idRol: 'rol-1',
      },
    };
  }
}

describe('CrearProyectoUseCase', () => {
  it('debe crear el proyecto asociado al usuario creador', async () => {
    const repository = new ProyectoRepositoryFake();

    const useCase = new CrearProyectoUseCase(repository);

    const resultado = await useCase.execute({
      idUsuario: 'usuario-1',
      nombre: ' Proyecto UML ',
      descripcion: ' Proyecto colaborativo ',
    });

    expect(repository.datos).toEqual({
      idUsuario: 'usuario-1',
      nombre: 'Proyecto UML',
      descripcion: 'Proyecto colaborativo',
      configuracion: {},
    });

    expect(resultado).toMatchObject({
      id: 'proyecto-1',
      nombre: 'Proyecto UML',
      estado: 'ACTIVO',
    });
  });
});
