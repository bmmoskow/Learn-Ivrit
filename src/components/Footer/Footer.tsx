import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col items-center gap-3">
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span>Translations powered by</span>
              <a
                href="https://ai.google.dev/gemini-api"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Google Gemini
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <span className="hidden sm:inline text-gray-400">•</span>
            <div className="flex items-center gap-2">
              <span>Biblical texts from</span>
              <a
                href="https://www.sefaria.org"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center hover:opacity-80 transition-opacity"
              >
                <img
                  src="/sefaria.png"
                  alt="Powered by Sefaria"
                  className="h-6"
                />
              </a>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <Link
              to="/contact"
              className="hover:text-blue-600 transition-colors"
            >
              Contact Us
            </Link>
            <span className="text-gray-400">•</span>
            <Link
              to="/terms"
              className="hover:text-blue-600 transition-colors"
            >
              Terms of Service
            </Link>
            <span className="text-gray-400">•</span>
            <Link
              to="/privacy"
              className="hover:text-blue-600 transition-colors"
            >
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
