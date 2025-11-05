import "@/app/globals.css";
import PrivateShell from "@/components/PrivateShell";

export default function SuperLayout({ children }: { children: React.ReactNode }) {
  return <PrivateShell>{children}</PrivateShell>;
}
