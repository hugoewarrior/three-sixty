type Variant = 'default' | 'blue' | 'green' | 'yellow' | 'red';

const variantClasses: Record<Variant, string> = {
  default: 'bg-gray-800 text-gray-300',
  blue: 'bg-blue-950 text-blue-400',
  green: 'bg-green-950 text-green-400',
  yellow: 'bg-yellow-950 text-yellow-400',
  red: 'bg-red-950 text-red-400',
};

export function Badge({
  children,
  variant = 'default',
  className = '',
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variantClasses[variant],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}
