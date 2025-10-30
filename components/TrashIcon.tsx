// Heroicons mini trash SVG (MIT License)
export default function TrashIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 20 20"
      strokeWidth={1.5}
      stroke="currentColor"
      className={className}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6.75 7.75v5.5m3-5.5v5.5m-6-7.5h12m-1.5 0v9.25A2.25 2.25 0 0 1 12 17.25H8a2.25 2.25 0 0 1-2.25-2.25V4.75m3-2h2a.75.75 0 0 1 .75.75v.5h-5.5v-.5a.75.75 0 0 1 .75-.75z"
      />
    </svg>
  );
}
