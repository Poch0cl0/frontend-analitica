import { useState, useEffect, useCallback } from 'react';
import { getTriajePriorizados, sincronizarTriaje } from '../../../services/api';
import type { TriajePriorizadoItem, TriajeAlgoritmo } from '../../../services/api';

export function useTriaje(pacienteId: number | null) {
  const [items, setItems] = useState<TriajePriorizadoItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<TriajePriorizadoItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (pacienteId === null) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getTriajePriorizados();
      setItems(data);
      const match = data.find(p => p.paciente_id === pacienteId) ?? null;
      setSelectedItem(match);
    } catch (err: any) {
      console.error(err);
      setError('Error al cargar datos de triaje.');
    } finally {
      setLoading(false);
    }
  }, [pacienteId]);

  useEffect(() => {
    load();
  }, [load]);

  const sincronizar = useCallback(async () => {
    setSyncing(true);
    try {
      await sincronizarTriaje();
      await load();
    } catch (err: any) {
      console.error(err);
      setError('Error al sincronizar triaje.');
    } finally {
      setSyncing(false);
    }
  }, [load]);

  return { selectedItem, items, loading, syncing, error, sincronizar, recargar: load };
}
