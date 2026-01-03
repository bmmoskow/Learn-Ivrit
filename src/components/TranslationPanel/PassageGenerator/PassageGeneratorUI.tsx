import { Loader2, Sparkles, X } from "lucide-react";
import {
  AgeLevel,
  SPECIAL_AGE_LEVELS,
  MIN_AGE,
  MAX_NUMERIC_AGE,
  getAgeLevelLabel,
} from "./passageGeneratorUtils";

interface PassageGeneratorUIProps {
  ageLevel: AgeLevel;
  topic: string;
  isGenerating: boolean;
  error: string | null;
  onAgeLevelChange: (level: AgeLevel) => void;
  onTopicChange: (topic: string) => void;
  onGenerate: () => void;
  onClose: () => void;
}

export function PassageGeneratorUI({
  ageLevel,
  topic,
  isGenerating,
  error,
  onAgeLevelChange,
  onTopicChange,
  onGenerate,
  onClose,
}: PassageGeneratorUIProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate();
  };

  const handleAgeLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    // Check if it's a number or a special level
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue)) {
      onAgeLevelChange(numValue);
    } else {
      onAgeLevelChange(value as "adult" | "professional" | "academic");
    }
  };

  // Build options: ages 5-22 + special levels
  const ageOptions: { value: string; label: string }[] = [];
  for (let age = MIN_AGE; age <= MAX_NUMERIC_AGE; age++) {
    ageOptions.push({ value: String(age), label: `Age ${age}` });
  }
  SPECIAL_AGE_LEVELS.forEach((level) => {
    ageOptions.push({ value: level.value, label: level.label });
  });

  const currentValue = typeof ageLevel === "number" ? String(ageLevel) : ageLevel;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Generate Hebrew Passage
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-sm text-gray-600 mb-6">
            Generate a personalized Hebrew reading passage tailored to your learning level and incorporating your
            vocabulary words (especially ones you're still learning).
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Age Level Selection Dropdown */}
            <div>
              <label htmlFor="age-level" className="block text-sm font-medium text-gray-700 mb-2">
                Reading Level
              </label>
              <select
                id="age-level"
                value={currentValue}
                onChange={handleAgeLevelChange}
                disabled={isGenerating}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white text-lg"
              >
                {ageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Description */}
            <div>
              <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
                Topic Description
              </label>
              <textarea
                id="topic"
                value={topic}
                onChange={(e) => onTopicChange(e.target.value)}
                placeholder="Describe what you want the passage to be about. Example: A story about a boy who loses his dog in the park and asks strangers for help finding it."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                rows={4}
                maxLength={500}
              />
              <div className="text-xs text-gray-400 mt-1 text-right">{topic.length}/500 characters</div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                disabled={isGenerating}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating || !topic.trim()}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Passage
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">
              The AI will prioritize your weakest vocabulary words and create natural variations (conjugations,
              prefixes, suffixes) to help reinforce your learning.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
