import { AuthScreen } from "@/components/AuthScreen";

export const metadata = {
  title: "Đăng nhập - BrewLite",
};

export default function LoginPage() {
  return <AuthScreen mode="login" />;
}
