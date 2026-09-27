import { Server } from '@hocuspocus/server';
import {
  CaseApiClient,
  type CollaborationAccess,
} from './case-api.client.js';
import {
  crearDocumentoDesdeContenido,
  decodeDocumentStateBase64,
  encodeDocumentStateBase64,
  extraerContenidoDocumento,
} from './modelo-yjs.js';

interface CollaborationContext extends CollaborationAccess {
  accessToken: string;
}

function requiredEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`La variable ${name} es obligatoria`);
  }

  return value;
}

const port = Number(process.env.COLLABORATION_PORT ?? 1234);

if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
  throw new Error('COLLABORATION_PORT debe ser un puerto válido');
}

const api = new CaseApiClient(
  (process.env.CASE_API_URL ?? 'http://localhost:3000/api').replace(/\/$/, ''),
  requiredEnv('COLLABORATION_SERVICE_SECRET'),
);

const server = new Server({
  port,
  debounce: 800,
  maxDebounce: 4_000,

  async onAuthenticate(data) {
    if (!data.token) {
      throw new Error('Se requiere token de acceso');
    }

    const access = await api.authorize(data.documentName, data.token);
    data.connectionConfig.readOnly = !access.puedeEditar;

    return {
      ...access,
      accessToken: data.token,
    } satisfies CollaborationContext;
  },

  async onTokenSync(data) {
    const context = data.context as CollaborationContext;
    const access = await api.authorize(data.documentName, data.token);

    if (access.idUsuario !== context.idUsuario) {
      throw new Error('El token sincronizado no pertenece a la sesión actual');
    }

    data.connection.readOnly = !access.puedeEditar;

    return {
      ...access,
      accessToken: data.token,
    } satisfies CollaborationContext;
  },

  async beforeHandleMessage(data) {
    const context = data.context as CollaborationContext | undefined;

    if (!context) {
      throw new Error('Sesión colaborativa sin contexto autenticado');
    }

    const access = await api.authorize(data.documentName, context.accessToken);

    if (context.puedeEditar && !access.puedeEditar) {
      throw new Error('Los permisos de edición cambiaron durante la sesión');
    }
  },

  async onLoadDocument({ documentName }) {
    const snapshot = await api.loadSnapshot(documentName);

    if (snapshot.estadoYjsBase64) {
      return decodeDocumentStateBase64(snapshot.estadoYjsBase64);
    }

    return crearDocumentoDesdeContenido(snapshot.contenido);
  },

  async onStoreDocument({ documentName, document }) {
    const contenido = extraerContenidoDocumento(document);
    const estadoYjsBase64 = encodeDocumentStateBase64(document);

    await api.storeSnapshot(documentName, contenido, estadoYjsBase64);
  },

  onRequest({ request, response }) {
    return new Promise<void>((resolve, reject) => {
      if (request.url?.split('?')[0] !== '/health') {
        resolve();
        return;
      }

      response.writeHead(200, { 'Content-Type': 'application/json' });
      response.end(
        JSON.stringify({
          status: 'ok',
          service: 'collaboration',
        }),
      );

      reject();
    });
  },

  async onListen({ port: listeningPort }) {
    console.log(`Collaboration server listening on port ${listeningPort}`);
  },
});

await server.listen();
