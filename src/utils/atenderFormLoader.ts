import {
  getDatosClinicos,
  getPacientePerfil,
  type DatosClinicosResponse,
} from '../services/api';
import {
  atenderFormFromResponse,
  emptyAtenderForm,
  type DcAtenderForm,
} from '../components/DatosClinicosAtenderForm';

export async function loadAtenderFormForPaciente(pacienteId: number): Promise<{
  form: DcAtenderForm;
  dcExists: boolean;
  existingDc: DatosClinicosResponse | null;
}> {
  let edadMadre: number | null = null;

  try {
    const perfil = await getPacientePerfil(pacienteId);
    edadMadre = perfil.edad_madre ?? null;
  } catch {
    /* perfil opcional */
  }

  try {
    const dc = await getDatosClinicos(pacienteId);
    return {
      form: atenderFormFromResponse(dc, edadMadre),
      dcExists: true,
      existingDc: dc,
    };
  } catch (err: any) {
    if (err?.response?.status !== 404) {
      console.warn('No se pudieron cargar datos clínicos previos:', err);
    }
    return {
      form: {
        ...emptyAtenderForm,
        edad_madre: edadMadre != null ? String(edadMadre) : '',
      },
      dcExists: false,
      existingDc: null,
    };
  }
}
