interface AuthGateProps {  
  children: React.ReactNode;
  mode?: "guest" | "protected";
}

export function AuthGate({ children }: AuthGateProps) {
  return <>{children}</>;
}
