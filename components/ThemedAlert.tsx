import React from 'react';

export function ThemedAlert({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white text-black rounded-lg shadow-lg p-6 min-w-[280px] max-w-xs flex flex-col items-center">
        <div className="mb-4 text-center text-base font-medium">{message}</div>
        <button
          className="mt-2 px-6 py-2 rounded bg-green-500 text-white font-bold hover:bg-green-600 transition"
          onClick={onClose}
        >
          OK
        </button>
      </div>
    </div>
  );
}
