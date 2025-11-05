import "@/app/globals.css";
import PrivateShell from "@/components/PrivateShell";

export default function Layout({ children }: { children: React.ReactNode }) {
  return <PrivateShell>{children}</PrivateShell>;
}
