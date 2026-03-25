import { Button } from "../ui/button";
import logo from "../../assets/logo.svg";

interface WelcomeProps {
  onNext: () => void;
}

export function Welcome({ onNext }: WelcomeProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-8 text-center">
      <img src={logo} alt="Tiny Tummy logo" className="w-40 h-40 mb-6" />

      <h1 className="font-[var(--font-display)] text-3xl font-bold text-[var(--color-text)] mb-3">
        Tiny Tummy
      </h1>
      <p className="text-[var(--color-text-secondary)] text-lg mb-2">
        Track with confidence, worry less
      </p>
      <p className="text-[var(--color-muted)] text-sm mb-10 max-w-xs">
        Smart tracking that knows what's normal for your baby's age. 100% private, 100% offline.
      </p>

      <Button variant="cta" size="lg" onClick={onNext} className="w-full max-w-xs text-lg">
        Get Started
      </Button>
    </div>
  );
}
