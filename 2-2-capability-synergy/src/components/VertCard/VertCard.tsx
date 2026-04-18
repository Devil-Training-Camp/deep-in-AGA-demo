export interface VertCardProps {
  category: string;
  title: string;
  duration: string;
  avatars: Array<{ src: string; alt?: string }>;
  onPlay?: () => void;
}

export function VertCard({ category, title, duration, avatars, onPlay }: VertCardProps) {
  return (
    <div className="w-[360px] flex flex-col justify-end gap-4 px-4 py-6 bg-[linear-gradient(125deg,rgba(117,85,206,1)_9%,rgba(140,156,247,1)_81%)] rounded-xl">
      <div className="flex gap-1">
        {avatars.slice(0, 4).map((avatar, index) => (
          <img
            key={index}
            src={avatar.src}
            alt={avatar.alt ?? `Avatar ${index + 1}`}
            className={`size-8 rounded-full border-2 border-white ${index > 0 ? '-ml-1' : ''}`}
          />
        ))}
      </div>
      <div className="flex flex-col gap-2 w-full">
        <span className="text-sm font-semibold text-white/50">{category}</span>
        <h2 className="text-2xl font-semibold text-white tracking-tight">{title}</h2>
        <span className="text-sm font-normal text-white/50">{duration}</span>
      </div>
      <button type="button" className="flex items-center justify-center gap-1 p-3 bg-[rgba(42,40,47,0.8)] rounded-lg" onClick={onPlay}>
        <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M8 5V19L19 12L8 5Z" />
        </svg>
        <span className="text-[13px] font-medium text-white">Play</span>
      </button>
    </div>
  );
}
