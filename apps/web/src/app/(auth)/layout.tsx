export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login uses a full-screen two-panel layout; register/forgot-password
  // are centered forms. Each page controls its own outer wrapper.
  return <>{children}</>;
}
