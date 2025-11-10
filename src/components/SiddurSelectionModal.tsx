import { useState } from "react";
import { X, Loader2, BookOpen } from "lucide-react";
import { siddurim, SiddurPrayer } from "../data/siddurim";

interface SiddurSelectionModalProps {
  onClose: () => void;
  onLoad: (reference: string, name: string, nameHebrew: string) => void;
  loading: boolean;
}

export function SiddurSelectionModal({ onClose, onLoad, loading }: SiddurSelectionModalProps) {
  const [selectedSiddur, setSelectedSiddur] = useState(0);
  const [selectedService, setSelectedService] = useState(0);
  const [selectedSection, setSelectedSection] = useState(0);
  const [selectedPrayer, setSelectedPrayer] = useState<SiddurPrayer | null>(null);

  const currentSiddur = siddurim[selectedSiddur];
  const currentService = currentSiddur?.services[selectedService];
  const currentSection = currentService?.sections[selectedSection];

  const handleLoad = () => {
    if (selectedPrayer) {
      onLoad(selectedPrayer.reference, selectedPrayer.name, selectedPrayer.nameHebrew);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-teal-600" />
            Load from Siddur
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Service</label>
            <select
              value={selectedService}
              onChange={(e) => {
                setSelectedService(Number(e.target.value));
                setSelectedSection(0);
                setSelectedPrayer(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {currentSiddur.services.map((service, idx) => (
                <option key={idx} value={idx}>
                  {service.nameHebrew} ({service.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Section</label>
            <select
              value={selectedSection}
              onChange={(e) => {
                setSelectedSection(Number(e.target.value));
                setSelectedPrayer(null);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              {currentService.sections.map((section, idx) => (
                <option key={idx} value={idx}>
                  {section.nameHebrew} ({section.name})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Prayer</label>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2">
              {currentSection.prayers.map((prayer, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedPrayer(prayer)}
                  className={`w-full text-right px-4 py-3 rounded-lg transition text-sm ${
                    selectedPrayer?.reference === prayer.reference
                      ? "bg-teal-100 border-2 border-teal-500 text-teal-900"
                      : "bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700"
                  }`}
                >
                  <div className="font-medium text-base" dir="rtl">
                    {prayer.nameHebrew}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{prayer.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleLoad}
            disabled={!selectedPrayer || loading}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading...
              </>
            ) : (
              <>
                <BookOpen className="w-4 h-4" />
                Load Prayer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
