import UserDetail from "@/components/screens/users/UserDetail";

export default async function UserDetailPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  return <UserDetail userId={userId} />;
}
