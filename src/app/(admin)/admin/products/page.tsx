import { getCurrentProfile } from "@/services/profile";
import { getAllAdminProducts } from "@/services/products";
import { Header } from "@/components/shared/header";
import { AdminProductsInteractive } from "@/components/admin/admin-products-interactive";

export default async function AdminProductsPage() {
  const [profile, products] = await Promise.all([
    getCurrentProfile(),
    getAllAdminProducts(),
  ]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <Header profile={profile} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AdminProductsInteractive initialProducts={products} />
      </main>
    </div>
  );
}
