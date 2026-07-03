import type { ReactNode } from 'react';
import { useModalBackdrop } from '../../hooks/useModalBackdrop';

interface ModalShellProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: 'md' | 'lg' | '2xl';
}

const widths = { md: 'max-w-md', lg: 'max-w-lg', '2xl': 'max-w-2xl' };

export default function ModalShell({ title, onClose, children, maxWidth = 'lg' }: ModalShellProps) {
  const backdrop = useModalBackdrop(onClose);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/60 flex items-center justify-center p-4 backdrop-blur-xs" {...backdrop}>
      <div className={`bg-white rounded-2xl ${widths[maxWidth]} w-full shadow-2xl border border-gray-100 overflow-hidden`} onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-extrabold text-lg text-gray-900">{title}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}
