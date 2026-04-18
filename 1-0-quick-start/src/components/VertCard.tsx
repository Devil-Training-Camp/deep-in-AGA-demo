import avatar1 from '../assets/avatar-1.png';
import avatar2 from '../assets/avatar-2.png';
import avatar3 from '../assets/avatar-3.png';
import avatar4 from '../assets/avatar-4.png';

const avatars = [avatar1, avatar2, avatar3, avatar4];

export default function VertCard() {
  return (
    <div
      className="flex flex-col gap-6 rounded-xl px-4 py-6"
      style={{ backgroundColor: '#7949FF', width: 360 }}
    >
      {/* top */}
      <div className="flex flex-row items-start gap-4">
        <h2
          className="flex-1 text-white font-semibold leading-tight"
          style={{ fontSize: 24, letterSpacing: '-0.04em' }}
        >
          Constructive and destructive waves
        </h2>
        <button className="shrink-0 w-6 h-6 text-white" aria-label="More options">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </button>
      </div>

      {/* avatars */}
      <div className="flex flex-row">
        {avatars.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={`avatar ${i + 1}`}
            className="w-16 h-16 rounded-full object-cover border-2 border-white"
            style={{ marginLeft: i === 0 ? 0 : -8 }}
          />
        ))}
        {/* count badge */}
        <div
          className="w-16 h-16 rounded-full flex flex-col items-center justify-center gap-2 border-2 border-white"
          style={{ marginLeft: -8, backgroundColor: '#2A282F' }}
        >
          <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
          <span className="text-white font-medium" style={{ fontSize: 13 }}>
            40.2k
          </span>
        </div>
      </div>

      {/* bottom */}
      <div className="flex flex-row items-center justify-between gap-6">
        <div className="flex flex-row items-center gap-1">
          {['2 hours', '·', 'October 30, 2023'].map((text, i) => (
            <span key={i} className="text-white font-medium" style={{ fontSize: 13 }}>
              {text}
            </span>
          ))}
        </div>
        <button
          className="flex flex-row items-center gap-1 rounded-lg px-3 py-3 text-white font-medium"
          style={{ fontSize: 13, backgroundColor: 'rgba(42, 40, 47, 0.8)' }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          Play
        </button>
      </div>
    </div>
  );
}
