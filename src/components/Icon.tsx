import { iconPath } from '../lib/icons';

export function Icon({ name, size = 18, sw = 1.7 }: { name: string; size?: number; sw?: number }) {
  return (
    <svg
      className="ic"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: iconPath(name) }}
    />
  );
}
