import { redirect } from "next/navigation";

export default function Home() {
  // No auth yet — entry point routes to the login screen.
  redirect("/login");
}
