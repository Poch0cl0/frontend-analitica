import { useEffect, useMemo, useRef, useState } from 'react';
import { getPacientesFiltered, type MedicoResumen, type PacienteResponse } from '../../services/api';

export type EntitySelectMode = 'paciente' | 'medico';

interface SearchableEntitySelectProps {
  mode: EntitySelectMode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  medicos?: MedicoResumen[];
  required?: boolean;
  placeholder?: string;
  onPacientePicked?: (p: PacienteResponse) => void;
}

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

export default function SearchableEntitySelect({
  mode,
  label,
  value,
  onChange,
  medicos = [],
  required,
  placeholder,
  onPacientePicked,
}: SearchableEntitySelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [pacientes, setPacientes] = useState<PacienteResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const selectedPaciente = mode === 'paciente'
    ? pacientes.find(p => String(p.id) === value)
    : undefined;
  const selectedMedico = mode === 'medico'
    ? medicos.find(m => String(m.id) === value)
    : undefined;

  useEffect(() => {
    if (mode !== 'paciente' || !value || selectedPaciente) return;
    getPacientesFiltered({ estado: 'activo', limit: 50 })
      .then(res => {
        const found = res.items.find(p => String(p.id) === value);
        if (found) setPacientes(prev => (prev.some(p => p.id === found.id) ? prev : [...prev, found]));
      })
      .catch(() => undefined);
  }, [mode, value, selectedPaciente]);

  useEffect(() => {
    if (mode !== 'paciente') return;
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await getPacientesFiltered({
          q: query.trim() || undefined,
          estado: 'activo',
          limit: 30,
        });
        setPacientes(res.items);
      } catch {
        setPacientes([]);
      } finally {
        setLoading(false);
      }
    }, 280);
    return () => window.clearTimeout(t);
  }, [mode, query]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const medicoOptions = useMemo(() => {
    const q = normalize(query.trim());
    if (!q) return medicos;
    return medicos.filter(m => normalize(`${m.nombre} ${m.apellidos}`).includes(q));
  }, [medicos, query]);

  const displayValue = mode === 'paciente'
    ? (selectedPaciente ? `${selectedPaciente.nombre} ${selectedPaciente.apellidos} · DNI ${selectedPaciente.dni}` : '')
    : (selectedMedico ? `Dr. ${selectedMedico.nombre} ${selectedMedico.apellidos}` : '');

  const pick = (id: string) => {
    onChange(id);
    setQuery('');
    setOpen(false);
    if (mode === 'paciente' && onPacientePicked) {
      const p = pacientes.find(x => String(x.id) === id);
      if (p) onPacientePicked(p);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">{label}</label>
      <input
        type="text"
        required={required && !value}
        value={open ? query : displayValue}
        placeholder={placeholder ?? (mode === 'paciente' ? 'Buscar por nombre o DNI...' : 'Buscar médico por nombre...')}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value) onChange('');
        }}
        onFocus={() => setOpen(true)}
        className="w-full text-sm px-3.5 py-2.5 border border-gray-200 rounded-xl bg-gray-50"
      />
      {value && !open && (
        <button
          type="button"
          className="absolute right-2 top-8 text-gray-400 hover:text-gray-600 text-xs"
          onClick={() => { onChange(''); setQuery(''); }}
        >
          ✕
        </button>
      )}
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {loading && mode === 'paciente' && (
            <p className="px-3 py-2 text-xs text-gray-400">Buscando...</p>
          )}
          {mode === 'paciente' && !loading && pacientes.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">Sin pacientes activas</p>
          )}
          {mode === 'paciente' && pacientes.map(p => (
            <button
              key={p.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-fuchsia-50 border-b border-gray-50 last:border-0"
              onClick={() => pick(String(p.id))}
            >
              <span className="font-semibold text-gray-900">{p.nombre} {p.apellidos}</span>
              <span className="block text-[10px] text-gray-500">DNI {p.dni}</span>
            </button>
          ))}
          {mode === 'medico' && medicoOptions.map(m => (
            <button
              key={m.id}
              type="button"
              className="w-full text-left px-3 py-2 text-sm hover:bg-fuchsia-50 border-b border-gray-50 last:border-0"
              onClick={() => pick(String(m.id))}
            >
              Dr. {m.nombre} {m.apellidos}
            </button>
          ))}
          {mode === 'medico' && medicoOptions.length === 0 && (
            <p className="px-3 py-2 text-xs text-gray-400">Sin médicos</p>
          )}
        </div>
      )}
    </div>
  );
}
