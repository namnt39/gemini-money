import { supabase } from "@/lib/supabaseClient";
import TransactionForm from "./TransactionForm";

// Thêm các trường cashback vào type Account
export type Account = { 
  id: string; 
  name: string; 
  image_url: string | null; 
  type: string | null;
  is_cashback_eligible: boolean | null;
  cashback_percentage: number | null;
  max_cashback_amount: number | null;
};
export type Subcategory = { 
  id: string; 
  name: string; 
  image_url: string | null;
  categories: { 
    name: string; 
    transaction_nature: string; 
  }[] | null 
};
export type Person = { 
  id: string; 
  name: string; 
  image_url: string | null; 
};

async function getFormData() {
  // Lấy thêm các trường cashback từ bảng accounts
  const accountsPromise = supabase.from("accounts").select("id, name, image_url, type, is_cashback_eligible, cashback_percentage, max_cashback_amount");
  const subcategoriesPromise = supabase.from("subcategories").select("id, name, image_url, categories(name, transaction_nature)");
  const peoplePromise = supabase.from("people").select("id, name, image_url");

  const [
    { data: accounts, error: accountsError },
    { data: subcategories, error: subcategoriesError },
    { data: people, error: peopleError },
  ] = await Promise.all([accountsPromise, subcategoriesPromise, peoplePromise]);

  if (accountsError || subcategoriesError || peopleError) {
    console.error("Error fetching form data:", { accountsError, subcategoriesError, peopleError });
  }

  return {
    accounts: (accounts as Account[]) || [],
    subcategories: (subcategories as Subcategory[]) || [],
    people: (people as Person[]) || [],
  };
}

export default async function AddTransactionPage() {
  const { accounts, subcategories, people } = await getFormData();

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-800 mb-6">
        Thêm Giao dịch mới
      </h1>
      <div className="bg-white rounded-lg shadow-md">
        <TransactionForm
          accounts={accounts}
          subcategories={subcategories}
          people={people}
        />
      </div>
    </div>
  );
}