export {
  getCitas,
  getCitaById,
  createCita,
  updateCita,
  deleteCita,
  changeCitaEstado,
  getDisponibilidad,
  getDisponibilidadResumen,
  validarHorarioCita,
  getMedicos,
} from './api';

export type {
  CitaCreate,
  CitaUpdate,
  CitaResponse,
  CitaResponseEnriquecida,
  DisponibilidadSlot,
  DisponibilidadResponse,
  MedicoDisponibilidadResumen,
  DisponibilidadResumenResponse,
  MedicoResumen,
} from './api';
