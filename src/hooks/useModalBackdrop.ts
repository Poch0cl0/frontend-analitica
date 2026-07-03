import { useRef, type MouseEvent } from 'react';

/** Cierra el modal solo si mousedown y mouseup ocurren en el fondo (no al arrastrar desde fuera). */
export function useModalBackdrop(onClose: () => void) {
  const pressedOnBackdrop = useRef(false);

  return {
    onMouseDown: (e: MouseEvent<HTMLElement>) => {
      pressedOnBackdrop.current = e.target === e.currentTarget;
    },
    onMouseUp: (e: MouseEvent<HTMLElement>) => {
      if (pressedOnBackdrop.current && e.target === e.currentTarget) {
        onClose();
      }
      pressedOnBackdrop.current = false;
    },
  };
}
