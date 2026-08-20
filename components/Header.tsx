import Image from 'next/image';
import Link from 'next/link';
import SearchBar from './SearchBar';

export default function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-white px-6 py-3 shadow-sm w-full">
      {/* Left side: Logo & Title group */}
      <Link href="/" className="flex items-center gap-3">
        <Image
          src="/thaicert-logo.png"
          alt="ThaiCERT Logo"
          width={120}
          height={40}
          className="h-auto w-auto object-contain"
          priority
        />
        <span className="text-3xl font-semibold text-gray-900 tracking-tight">
          ThaiCERT Phonebook
        </span>
      </Link>

      {/* Right side: User Profile Avatar */}
      <div className="flex items-center gap-4">
        <SearchBar/>
        <button className="relative h-10 w-10 overflow-hidden rounded-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-300">
          <Image
            src="/avatar.png" //รูปโปรไฟล์ของuser
            alt="User Avatar"
            fill
            className="object-cover"
          />
        </button>
      </div>
    </header>
  );
}