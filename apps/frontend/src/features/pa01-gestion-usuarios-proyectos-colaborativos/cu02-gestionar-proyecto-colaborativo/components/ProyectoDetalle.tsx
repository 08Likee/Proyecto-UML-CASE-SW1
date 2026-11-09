import type { AccesoProyecto, Proyecto } from '../api/proyectos.api';

interface ProyectoDetalleProps {
  proyecto: Proyecto;
  acceso: AccesoProyecto | null;
  puedeModificar: boolean;
  puedeAdministrarParticipantes: boolean;
  onEditar: () => void;
  puedeEliminar: boolean;
  onEliminar: () => void;
  onAdministrarParticipantes: () => void;
}

function formatearFecha(valor: string): string {
  return new Date(valor).toLocaleString();
}

export function ProyectoDetalle({
  proyecto,
  acceso,
  puedeModificar,
  puedeAdministrarParticipantes,
  onEditar,
  puedeEliminar,
  onEliminar,
  onAdministrarParticipantes,
}: ProyectoDetalleProps) {
  return (
    <section className="project-management-card">
      <div className="project-management-heading">
        <div>
          <div className="eyebrow">Proyecto seleccionado</div>
          <h2>{proyecto.nombre}</h2>
          <p className="project-description">
            {proyecto.descripcion || 'Este proyecto no tiene una descripción registrada.'}
          </p>
        </div>

        <div className="project-management-actions">
          {puedeAdministrarParticipantes && (
            <button type="button" onClick={onAdministrarParticipantes}>
              Participantes y roles
            </button>
          )}
          {puedeEliminar && (
            <button type="button" onClick={onEliminar}>Mover proyecto a papelera</button>
          )}
          {puedeModificar && (
            <button type="button" onClick={onEditar}>
              Editar proyecto
            </button>
          )}
        </div>
      </div>

      <div className="project-facts">
        <div>
          <span>Estado</span>
          <strong>{proyecto.estado}</strong>
        </div>
        <div>
          <span>Rol</span>
          <strong>{acceso?.rol.nombre ?? 'Cargando…'}</strong>
        </div>
        <div>
          <span>Creado</span>
          <strong>{formatearFecha(proyecto.fechaCreacion)}</strong>
        </div>
        <div>
          <span>Última actualización</span>
          <strong>{formatearFecha(proyecto.fechaActualizacion)}</strong>
        </div>
      </div>
    </section>
  );
}
