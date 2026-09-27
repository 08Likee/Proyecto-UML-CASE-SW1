const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface CollaborationDocumentIdentity {
  idProyecto: string;
  idModelo: string;
}

export function parseDocumentName(
  documentName: string,
): CollaborationDocumentIdentity {
  const [prefix, idProyecto, idModelo, extra] = documentName.split(':');

  if (
    prefix !== 'modelo-uml' ||
    extra !== undefined ||
    !idProyecto ||
    !idModelo ||
    !UUID_PATTERN.test(idProyecto) ||
    !UUID_PATTERN.test(idModelo)
  ) {
    throw new Error('Nombre de documento colaborativo inválido');
  }

  return { idProyecto, idModelo };
}
