import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default function HomePage() {
  const cookieStore = cookies();
  const token = cookieStore.get("cr_token")?.value;
  if (!token) {
    redirect("/login");
  }

  const role = cookieStore.get("cr_role")?.value;
  if (role === "manager") {
    redirect("/area");
  }

  redirect("/agent");
}
