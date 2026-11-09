/**
 * CU-11: catálogo local, determinista y versionado con las funciones realmente
 * presentes en el producto. No depende de IA ni ejecuta acciones del usuario.
 */
export type RequisitoGuia =
  | 'AUTENTICADO'
  | 'PROYECTO'
  | 'MODELO'
  | 'EDITAR_MODELO'
  | 'CONSULTAR_CONVERSACIONES'
  | 'PROPONER_UML'
  | 'GENERAR_BACKEND'
  | 'IMPORTAR_XMI'
  | 'EXPORTAR_XMI';

export interface ContextoAprendizaje {
  autenticado: boolean;
  proyectoSeleccionado: boolean;
  modeloAbierto: boolean;
  puedeEditarModelo: boolean;
  puedeConsultarConversaciones: boolean;
  puedeGenerarBackend: boolean;
  puedeImportarXmi: boolean;
  puedeExportarXmi: boolean;
}

export interface PasoGuia {
  titulo: string;
  indicacion: string;
  orientacion: string;
  requisito: RequisitoGuia;
  control?: string;
  controlesAdicionales?: readonly string[];
}

export interface GuiaAprendizaje {
  id: string;
  titulo: string;
  objetivo: string;
  pasos: readonly PasoGuia[];
}

export const GUIAS_CU11: readonly GuiaAprendizaje[] = [
  {
    id: 'crear-clase',
    titulo: 'Crear una clase UML',
    objetivo: 'Localizar un modelo, crear una clase y conocer sus propiedades.',
    pasos: [
      {
        titulo: 'Seleccionar un proyecto',
        indicacion: 'En la pantalla principal, elegí un proyecto donde tengas acceso.',
        orientacion: 'Los modelos y permisos pertenecen a un proyecto. La guía no cambia tu membresía.',
        requisito: 'AUTENTICADO',
        control: 'selector-proyecto',
      },
      {
        titulo: 'Abrir un modelo',
        indicacion: 'En Modelos del proyecto, elegí «Abrir» sobre el diagrama que vas a utilizar.',
        orientacion: 'Si todavía no hay un modelo, un usuario con permiso MODELO/EDITAR puede crearlo desde «+ Nuevo modelo».',
        requisito: 'PROYECTO',
        control: 'abrir-modelo',
      },
      {
        titulo: 'Agregar una clase',
        indicacion: 'En el diagramador, seleccioná «+ Clase». La acción requiere MODELO/EDITAR.',
        orientacion: 'El Espectador puede consultar un modelo, pero nunca obtiene edición por participar en una guía.',
        requisito: 'EDITAR_MODELO',
        control: 'crear-clase',
      },
      {
        titulo: 'Revisar propiedades',
        indicacion: 'Seleccioná la nueva clase y usá el panel Propiedades para ajustar nombre, atributos y operaciones.',
        orientacion: 'En UML, los atributos describen el estado y las operaciones el comportamiento. Revisá tipos y visibilidad antes de generar el backend.',
        requisito: 'EDITAR_MODELO',
        control: 'inspector',
      },
    ],
  },
  {
    id: 'relaciones',
    titulo: 'Asociaciones y multiplicidades',
    objetivo: 'Comprender las relaciones UML y configurar las multiplicidades de sus extremos.',
    pasos: [
      {
        titulo: 'Abrir el diagrama',
        indicacion: 'Abrí un modelo existente desde la lista de modelos del proyecto.',
        orientacion: 'Podés estudiar las asociaciones incluso en modo Solo lectura; editarlas requiere MODELO/EDITAR.',
        requisito: 'PROYECTO',
        control: 'abrir-modelo',
      },
      {
        titulo: 'Conectar dos clases',
        indicacion: 'En el diagramador, arrastrá desde el conector de una clase hacia otra.',
        orientacion: 'Esta operación crea una relación solamente si tu cuenta tiene permiso de edición. El tutorial nunca hace la conexión por vos.',
        requisito: 'EDITAR_MODELO',
        control: 'lienzo-uml',
      },
      {
        titulo: 'Ajustar multiplicidades',
        indicacion: 'Seleccioná la relación y revisá Tipo y las multiplicidades de Origen y Destino en Propiedades.',
        orientacion: 'La multiplicidad junto a Cliente indica cuántos Clientes corresponden a una Venta; la que está junto a Venta indica cuántas Ventas corresponden a un Cliente. «1» significa exactamente uno y «0..*» cero o muchos.',
        requisito: 'EDITAR_MODELO',
        control: 'inspector',
      },
    ],
  },
  {
    id: 'conversaciones',
    titulo: 'Conversaciones compartidas con IA',
    objetivo: 'Abrir una conversación y diferenciar el envío al equipo de las consultas a la IA.',
    pasos: [
      {
        titulo: 'Abrir conversaciones',
        indicacion: 'Desde el proyecto o el diagramador, abrí «Conversaciones».',
        orientacion: 'Las conversaciones están vinculadas al proyecto. Su acceso exige membresía activa y permiso de consulta del proyecto.',
        requisito: 'CONSULTAR_CONVERSACIONES',
        control: 'abrir-conversaciones',
      },
      {
        titulo: 'Crear o elegir conversación',
        indicacion: 'Creá una conversación con un título claro o seleccioná una del historial.',
        orientacion: 'Cada conversación mantiene sus propios mensajes. Los miembros autorizados del proyecto pueden leer su historial.',
        requisito: 'CONSULTAR_CONVERSACIONES',
        control: 'crear-conversacion',
      },
      {
        titulo: 'Elegir la acción de envío',
        indicacion: 'Escribí el mensaje y decidí entre «Enviar al equipo» y «Consultar IA».',
        orientacion: 'Enviar al equipo publica un mensaje humano; Consultar IA solicita una respuesta remota. Dictar por voz solo rellena el editor hasta que confirmes el envío.',
        requisito: 'CONSULTAR_CONVERSACIONES',
        control: 'editor-conversacion',
        controlesAdicionales: ['enviar-equipo', 'consultar-ia', 'analizar-uml', 'proponer-uml'],
      },
    ],
  },
  {
    id: 'propuestas-ia',
    titulo: 'Propuestas de cambios UML',
    objetivo: 'Consultar el modelo con IA y comprender la revisión y aceptación humana.',
    pasos: [
      {
        titulo: 'Abrir modelo y conversaciones',
        indicacion: 'Entrá en un modelo del proyecto y abrí «Conversaciones».',
        orientacion: 'La generación de propuestas usa el modelo persistido y una conversación activa del mismo proyecto.',
        requisito: 'MODELO',
        control: 'abrir-conversaciones',
      },
      {
        titulo: 'Solicitar una propuesta',
        indicacion: 'Describí los cambios deseados y elegí «Proponer cambios UML».',
        orientacion: 'El servicio remoto puede no estar disponible; la guía sigue funcionando. Una propuesta pendiente no altera el modelo.',
        requisito: 'PROPONER_UML',
        control: 'proponer-uml',
        controlesAdicionales: ['editor-conversacion'],
      },
      {
        titulo: 'Revisar y decidir',
        indicacion: 'Abrí «Ver propuestas UML» y examiná las clases, atributos, relaciones y versión.',
        orientacion: 'Solo un usuario con MODELO/EDITAR puede aceptar o rechazar. Una propuesta desactualizada se bloquea y debe regenerarse; la IA nunca aplica cambios por sí sola.',
        requisito: 'PROPONER_UML',
        control: 'ver-propuestas',
      },
    ],
  },
  {
    id: 'generar-backend',
    titulo: 'Generar backend Spring Boot',
    objetivo: 'Ubicar la generación del backend y comprender sus condiciones previas.',
    pasos: [
      {
        titulo: 'Seleccionar un proyecto',
        indicacion: 'Seleccioná el proyecto que contiene el modelo UML que querés transformar.',
        orientacion: 'La generación trabaja con modelos de un proyecto autorizado.',
        requisito: 'PROYECTO',
        control: 'selector-proyecto',
      },
      {
        titulo: 'Abrir el generador',
        indicacion: 'Desde la tarjeta del modelo, presioná «Generar backend».',
        orientacion: 'La operación requiere GENERACION/GENERAR. Si no ves el botón, revisá tus permisos con el Anfitrión.',
        requisito: 'GENERAR_BACKEND',
        control: 'generar-backend',
      },
      {
        titulo: 'Revisar validaciones y descargar',
        indicacion: 'Revisá advertencias del modelo y las opciones disponibles antes de generar el proyecto.',
        orientacion: 'Las clases persistentes requieren identificar su clave. La guía no inicia la generación ni descarga archivos automáticamente.',
        requisito: 'GENERAR_BACKEND',
      },
    ],
  },
  {
    id: 'interoperabilidad',
    titulo: 'Importar y exportar XMI',
    objetivo: 'Ubicar las funciones de interoperabilidad con Enterprise Architect.',
    pasos: [
      {
        titulo: 'Elegir un proyecto',
        indicacion: 'Seleccioná el proyecto al que pertenece el modelo que querés importar o exportar.',
        orientacion: 'El intercambio XMI cubre el subconjunto de UML soportado por la herramienta.',
        requisito: 'PROYECTO',
        control: 'selector-proyecto',
      },
      {
        titulo: 'Localizar la importación',
        indicacion: 'Si tenés permiso MODELO/IMPORTAR, localizá «Importar XMI».',
        orientacion: 'La importación requiere validar el archivo. Este recorrido no sube documentos por sí mismo.',
        requisito: 'IMPORTAR_XMI',
        control: 'importar-xmi',
      },
      {
        titulo: 'Localizar la exportación',
        indicacion: 'Si tenés permiso MODELO/EXPORTAR, usá «Exportar XMI» en la tarjeta de un modelo.',
        orientacion: 'Solo se exportan las estructuras UML soportadas; ni conversaciones ni propuestas pendientes se incorporan automáticamente al XMI.',
        requisito: 'EXPORTAR_XMI',
        control: 'exportar-xmi',
      },
    ],
  },
];

export function condicionDePaso(paso: PasoGuia, contexto: ContextoAprendizaje): string | null {
  if (!contexto.autenticado) return 'Iniciá sesión para continuar con esta guía.';
  switch (paso.requisito) {
    case 'AUTENTICADO': return null;
    case 'PROYECTO':
      return contexto.proyectoSeleccionado ? null : 'Seleccioná un proyecto al que tengas acceso.';
    case 'MODELO':
      if (!contexto.proyectoSeleccionado) return 'Seleccioná primero un proyecto.';
      return contexto.modeloAbierto ? null : 'Abrí un modelo UML desde la lista de modelos.';
    case 'EDITAR_MODELO':
      if (!contexto.modeloAbierto) return 'Abrí un modelo UML para continuar.';
      return contexto.puedeEditarModelo ? null : 'Necesitás permiso MODELO / EDITAR. La guía no concede permisos.';
    case 'CONSULTAR_CONVERSACIONES':
      if (!contexto.proyectoSeleccionado) return 'Seleccioná primero un proyecto.';
      return contexto.puedeConsultarConversaciones ? null : 'Necesitás permiso PROYECTO / CONSULTAR.';
    case 'PROPONER_UML':
      if (!contexto.modeloAbierto) return 'Abrí un modelo UML antes de solicitar propuestas.';
      return contexto.puedeConsultarConversaciones ? null : 'Necesitás permiso PROYECTO / CONSULTAR.';
    case 'GENERAR_BACKEND':
      if (!contexto.proyectoSeleccionado) return 'Seleccioná primero un proyecto.';
      return contexto.puedeGenerarBackend ? null : 'Necesitás permiso GENERACION / GENERAR.';
    case 'IMPORTAR_XMI':
      if (!contexto.proyectoSeleccionado) return 'Seleccioná primero un proyecto.';
      return contexto.puedeImportarXmi ? null : 'Necesitás permiso MODELO / IMPORTAR.';
    case 'EXPORTAR_XMI':
      if (!contexto.proyectoSeleccionado) return 'Seleccioná primero un proyecto.';
      return contexto.puedeExportarXmi ? null : 'Necesitás permiso MODELO / EXPORTAR.';
  }
}

export function guiaPorId(id: string): GuiaAprendizaje | undefined {
  return GUIAS_CU11.find((guia) => guia.id === id);
}
