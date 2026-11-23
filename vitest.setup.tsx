import "@testing-library/jest-dom";
import { vi } from "vitest";

Object.defineProperty(window, "localStorage", {
  value: {
    getItem: vi.fn(() => "[]"),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

Object.defineProperty(window, "dispatchEvent", {
  value: vi.fn(),
  writable: true,
});

HTMLDialogElement.prototype.showModal = vi.fn();
HTMLDialogElement.prototype.close = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/headers", () => ({
  cookies: () => ({
    getAll: () => [],
    set: vi.fn(),
  }),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  })),
  createBrowserClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signInWithPasskey: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    },
  })),
}));

vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
    aside: ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => <aside {...props}>{children}</aside>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("lucide-react", () => {
  const icons = [
    "ArrowRight", "ArrowUpRight", "Check", "Gamepad2", "Headphones",
    "ShieldCheck", "ShoppingBag", "ShoppingCart", "Sparkles", "X", "Zap",
    "Search", "Menu", "UserRound", "ArrowDownRight", "Countdown"
  ];
  const mockIcons: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {};
  for (const name of icons) {
    mockIcons[name] = ({ children, ...props }) => <svg {...props}>{children}</svg>;
  }
  return mockIcons;
});
