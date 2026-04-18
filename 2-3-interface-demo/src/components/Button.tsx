interface ButtonProps {
  label: string;
  variant: 'primary' | 'danger' | 'success';
  onClick: () => void;
}

const variantClass = {
  primary: 'bg-blue-500 hover:bg-blue-600 text-white',
  danger: 'bg-red-500 hover:bg-red-600 text-white',
  success: 'bg-green-500 hover:bg-green-600 text-white',
}

export default function Button({ label, variant, onClick }: ButtonProps) {
  return (
    <button
      className={`px-4 py-2 rounded font-medium transition-colors ${variantClass[variant]}`}
      onClick={onClick}
    >
      {label}
    </button>
  )
}
