import {
  PenLine,
  Image,
  Link,
  BookOpen,
  Sparkles,
  Bookmark,
} from "lucide-react";

interface InputLauncherProps {
  isGuest: boolean;
  onPasteType: () => void;
  onUploadImage: () => void;
  onLoadUrl: () => void;
  onLoadBible: () => void;
  onGenerateAI: () => void;
  onLoadBookmark: () => void;
}

interface LauncherCard {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
  guestOnly?: boolean;
}

export function InputLauncher({
  isGuest,
  onPasteType,
  onUploadImage,
  onLoadUrl,
  onLoadBible,
  onGenerateAI,
  onLoadBookmark,
}: InputLauncherProps) {
  const cards: LauncherCard[] = [
    {
      icon: <PenLine className="w-7 h-7" />,
      title: "Paste or Type",
      description: "Enter Hebrew or English text",
      onClick: onPasteType,
      color: "text-indigo-600 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300",
    },
    {
      icon: <Image className="w-7 h-7" />,
      title: "Upload Image",
      description: "Extract Hebrew from a photo",
      onClick: onUploadImage,
      color: "text-green-600 bg-green-50 border-green-200 hover:bg-green-100 hover:border-green-300",
    },
    {
      icon: <Link className="w-7 h-7" />,
      title: "Load from URL",
      description: "Fetch text from a webpage",
      onClick: onLoadUrl,
      color: "text-blue-600 bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300",
    },
    {
      icon: <BookOpen className="w-7 h-7" />,
      title: "Load from Bible",
      description: "Select a book and chapter",
      onClick: onLoadBible,
      color: "text-purple-600 bg-purple-50 border-purple-200 hover:bg-purple-100 hover:border-purple-300",
    },
    {
      icon: <Sparkles className="w-7 h-7" />,
      title: "Generate with AI",
      description: "Create a Hebrew passage",
      onClick: onGenerateAI,
      color: "text-amber-600 bg-amber-50 border-amber-200 hover:bg-amber-100 hover:border-amber-300",
    },
    {
      icon: <Bookmark className="w-7 h-7" />,
      title: "Load Bookmark",
      description: "Open a saved passage",
      onClick: onLoadBookmark,
      color: "text-rose-600 bg-rose-50 border-rose-200 hover:bg-rose-100 hover:border-rose-300",
      guestOnly: false,
    },
  ];

  const visibleCards = cards.filter((card) => {
    if (card.title === "Load Bookmark" && isGuest) return false;
    return true;
  });

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Translation Panel</h2>
        <p className="text-gray-500">Choose how you'd like to input text</p>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-w-xl w-full">
        {visibleCards.map((card) => (
          <button
            key={card.title}
            onClick={card.onClick}
            className={`flex flex-col items-center gap-2 p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer ${card.color}`}
          >
            {card.icon}
            <span className="font-semibold text-sm">{card.title}</span>
            <span className="text-xs opacity-70 leading-tight text-center">{card.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
