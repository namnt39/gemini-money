import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-64 flex-shrink-0 bg-gray-800 p-4 text-white">
      <h2 className="text-2xl font-bold mb-8">Gemini Money</h2>
      <nav>
        <ul>
          <li className="mb-4">
            <Link href="/" className="block p-2 rounded hover:bg-gray-700">
              Dashboard
            </Link>
          </li>
          <li className="mb-4">
            <Link href="/transactions" className="block p-2 rounded hover:bg-gray-700">
              Giao dịch
            </Link>
          </li>
          <li className="mb-4">
            <Link href="/categories" className="block p-2 rounded hover:bg-gray-700">
              Danh mục
            </Link>
          </li>
          <li className="mb-4">
            <a href="#" className="block p-2 rounded hover:bg-gray-700">
              Báo cáo
            </a>
          </li>
        </ul>
      </nav>
    </aside>
  );
}