import { useState } from 'react';
import type { FormEvent } from 'react';
import type { Proyecto } from '../api/proyectos.api';

export interface ProyectoFormValores {
  nombre: string;
  descripcion: string;
}

interface ProyectoFormProps {
  modo: 'crear' | 'editar';
  proyecto?: Proyecto | null;
  guardando: boolean;
  onGuardar: (valores: ProyectoFormValores) => Promise<void>;
  onCancelar: () => void;
}

export function ProyectoForm({
  modo,
  proyecto,
  guardando,
  onGuardar,
  onCancelar,
}: ProyectoFormProps) {
  const [nombre, setNombre] = useState(proyecto?.nombre ?? '');
  const [descripcion, setDescripcion] = useState(proyecto?.descripcion ?? '');

  const enviar = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!nombre.trim()) {
      return;
    }

    await onGuardar({
      nombre: nombre.trim(),
      descripcion: descripcion.trim(),
    });
  };

  return (
    <section className="project-management-card project-form-card">
      <div className="project-management-heading">
        <div>
          <div className="eyebrow">
            {modo === 'crear' ? 'Nuevo proyecto' : 'Configuración del proyecto'}
          </div>
          <h2>{modo === 'crear' ? 'Crear proyecto colaborativo' : 'Editar proyecto'}</h2>
          <p className="muted">
            {modo === 'crear'
              ? 'Define la información general. Quedarás incorporado automáticamente como Anfitrión.'
              : 'Actualiza la información general sin modificar participantes, roles ni permisos.'}
          </p>
        </div>
      </div>

      <form className="project-form" onSubmit={(event) => void enviar(event)}>
        <label>
          Nombre
          <input
            autoFocus
            required
            maxLength={150}
            value={nombre}
            onChange={(event) => setNombre(event.target.value)}
            placeholder="Ej. Sistema de ventas"
          />
        </label>

        <label>
          Descripción <span className="optional-label">(opcional)</span>
          <textarea
            rows={4}
            value={descripcion}
            onChange={(event) => setDescripcion(event.target.value)}
            placeholder="Describe brevemente el propósito del proyecto"
          />
        </label>

        <div className="project-form-actions">
          <button type="button" onClick={onCancelar} disabled={guardando}>
            Cancelar
          </button>
          <button className="primary-button" disabled={guardando || !nombre.trim()}>
            {guardando
              ? 'Guardando…'
              : modo === 'crear'
                ? 'Crear proyecto'
                : 'Guardar cambios'}
          </button>
        </div>
      </form>
    </section>
  );
}
