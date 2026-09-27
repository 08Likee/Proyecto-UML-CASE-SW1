import { parseDocumentName } from './document-name.js';

export interface CollaborationAccess {
  idUsuario: string;
  idProyecto: string;
  idModelo: string;
  puedeConsultar: true;
  puedeEditar: boolean;
  version: number;
}

export interface CollaborationSnapshot {
  idProyecto: string;
  idModelo: string;
  version: number;
  contenido: unknown;
  estadoYjsBase64: string | null;
}

export class CaseApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly serviceSecret: string,
  ) {}

  async authorize(
    documentName: string,
    accessToken: string,
  ): Promise<CollaborationAccess> {
    const { idProyecto, idModelo } = parseDocumentName(documentName);

    const response = await fetch(
      `${this.baseUrl}/proyectos/${idProyecto}/modelos-uml/${idModelo}/colaboracion/acceso`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    return this.readJson<CollaborationAccess>(response, 'autorizar colaboración');
  }

  async loadSnapshot(documentName: string): Promise<CollaborationSnapshot> {
    const { idProyecto, idModelo } = parseDocumentName(documentName);

    const response = await fetch(
      `${this.baseUrl}/colaboracion/interna/proyectos/${idProyecto}/modelos-uml/${idModelo}/snapshot`,
      {
        headers: this.internalHeaders(),
      },
    );

    return this.readJson<CollaborationSnapshot>(
      response,
      'cargar snapshot colaborativo',
    );
  }

  async storeSnapshot(
    documentName: string,
    contenido: unknown,
    estadoYjsBase64: string,
  ): Promise<CollaborationSnapshot> {
    const { idProyecto, idModelo } = parseDocumentName(documentName);

    const response = await fetch(
      `${this.baseUrl}/colaboracion/interna/proyectos/${idProyecto}/modelos-uml/${idModelo}/snapshot`,
      {
        method: 'PUT',
        headers: {
          ...this.internalHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ contenido, estadoYjsBase64 }),
      },
    );

    return this.readJson<CollaborationSnapshot>(
      response,
      'persistir snapshot colaborativo',
    );
  }

  private internalHeaders(): Record<string, string> {
    return {
      'x-collaboration-secret': this.serviceSecret,
    };
  }

  private async readJson<T>(response: Response, operation: string): Promise<T> {
    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `No se pudo ${operation}: HTTP ${response.status}${body ? ` - ${body}` : ''}`,
      );
    }

    return (await response.json()) as T;
  }
}
