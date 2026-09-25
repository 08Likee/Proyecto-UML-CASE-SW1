import { useEffect, useState } from "react";
import "./App.css";
import { getBackendHealth, type BackendHealth } from "./shared/api/health.api";

function App() {
  const [health, setHealth] = useState<BackendHealth | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getBackendHealth()
      .then(setHealth)
      .catch((unknownError: unknown) => {
        const message =
          unknownError instanceof Error
            ? unknownError.message
            : "Error desconocido";

        setError(message);
      });
  }, []);

  return (
    <main>
      <h1>Herramienta CASE Colaborativa</h1>

      {error && <p>Backend: error - {error}</p>}

      {!error && !health && <p>Verificando backend...</p>}

      {health && (
        <>
          <p>Backend: {health.status}</p>
          <p>Servicio: {health.service}</p>
          <p>Base de datos: {health.database}</p>
        </>
      )}
    </main>
  );
}

export default App;
