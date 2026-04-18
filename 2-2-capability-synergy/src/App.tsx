import { VertCard } from './components/VertCard';

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-8">
      <VertCard
        category="Reading Task"
        title="Constructive and destructive waves"
        duration="2 hours 40 minutes"
        avatars={[
          { src: 'https://i.pravatar.cc/32?img=1', alt: 'User 1' },
          { src: 'https://i.pravatar.cc/32?img=2', alt: 'User 2' },
          { src: 'https://i.pravatar.cc/32?img=3', alt: 'User 3' },
          { src: 'https://i.pravatar.cc/32?img=4', alt: 'User 4' },
        ]}
        onPlay={() => alert('Playing!')}
      />
    </div>
  );
}
