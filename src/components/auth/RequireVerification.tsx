import { ReactNode } from "react";

interface RequireVerificationProps {
  children: ReactNode;
}

// Emergency recovery: bypass verification to stabilize app
export function RequireVerification({ children }: RequireVerificationProps) {
  return <>{children}</>;
}


