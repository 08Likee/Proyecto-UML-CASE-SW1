import { WebWorkerMLCEngineHandler } from '@mlc-ai/web-llm';

const handler = new WebWorkerMLCEngineHandler();

self.onmessage = (mensaje: MessageEvent) => {
  handler.onmessage(mensaje);
};
