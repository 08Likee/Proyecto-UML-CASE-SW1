export interface BackendHealth {
  status: string;
  service: string;
  database: string;
  timestamp: string;
}

export async function getBackendHealth(): Promise<BackendHealth> {
  const apiUrl = import.meta.env.VITE_API_URL;

  if (!apiUrl) {
    throw new Error("VITE_API_URL no está configurada");
  }

  const response = await fetch(`${apiUrl}/health`);

  if (!response.ok) {
    throw new Error("No se pudo consultar el estado del backend");
  }

  return response.json() as Promise<BackendHealth>;
}
