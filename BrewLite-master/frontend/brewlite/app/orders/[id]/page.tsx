import { notFound } from "next/navigation";
import { OrderDetailScreen } from "@/components/OrderDetailScreen";

export const metadata = {
  title: "Chi tiết đơn - BrewLite",
};

export default async function OrderDetailPage(props: PageProps<"/orders/[id]">) {
  const { id } = await props.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId) || orderId <= 0) notFound();
  return <OrderDetailScreen id={orderId} />;
}