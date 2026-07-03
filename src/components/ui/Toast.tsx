import type { ToastType } from '../../hooks/useToast';

interface ToastProps {
  message: string;
  type: ToastType;
}

export default function Toast({ message, type }: ToastProps) {
  return (
    <div
      className="fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold"
      style={{
        backgroundColor: type === 'success' ? '#ECFDF5' : '#FEF2F2',
        color: type === 'success' ? '#065F46' : '#991B1B',
        borderColor: type === 'success' ? '#A7F3D0' : '#FCA5A5',
      }}
    >
      {message}
    </div>
  );
}
