import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { HelpCircle, BookOpen, GraduationCap, Languages, CheckCircle, FileText } from 'lucide-react';
<<<<<<< HEAD
import { APP_CONFIG } from '@/config/app';
=======
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0

export function FAQContent() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <HelpCircle className="w-8 h-8 text-blue-600" />
        <div>
          <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
<<<<<<< HEAD
          <p className="text-gray-600">Find answers to common questions about {APP_CONFIG.appName}</p>
=======
          <p className="text-gray-600">Find answers to common questions about Learn Ivrit</p>
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0
        </div>
      </div>

      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="what-is">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
<<<<<<< HEAD
              <span>What is {APP_CONFIG.appName}?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-700 leading-relaxed">
{APP_CONFIG.appName} is a comprehensive language learning tool designed to help you master Hebrew, both Modern and Biblical.
            It provides translation tools, vocabulary management, and adaptive testing to track your progress.
            Whether you're a beginner or advancing your skills, {APP_CONFIG.appName} adapts to your learning level.
=======
              <span>What is Learn Ivrit?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-700 leading-relaxed">
            Learn Ivrit is a comprehensive language learning tool designed to help you master Hebrew, both Modern and Biblical.
            It provides translation tools, vocabulary management, and adaptive testing to track your progress.
            Whether you're a beginner or advancing your skills, Learn Ivrit adapts to your learning level.
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="prerequisites">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
<<<<<<< HEAD
              <span>What do I need to know before using {APP_CONFIG.appName}?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-700 leading-relaxed">
{APP_CONFIG.appName} is designed for learners who already have a basic foundation in Hebrew:
=======
              <span>What do I need to know before using Learn Ivrit?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-700 leading-relaxed">
            Learn Ivrit is designed for learners who already have a basic foundation in Hebrew:
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>You should be able to read Hebrew text (recognize letters and vowel points)</li>
              <li>You should have rudimentary knowledge of Hebrew grammar</li>
              <li>Familiarity with basic vocabulary is helpful but not required</li>
            </ul>
            <div className="mt-3 p-3 bg-green-50 rounded-lg">
              <p className="font-medium text-green-900">Perfect for learners who:</p>
              <ul className="list-disc ml-6 mt-1 space-y-1 text-green-800">
                <li>Have completed an introductory Hebrew course</li>
                <li>Want to expand their vocabulary and reading comprehension</li>
                <li>Need practice reinforcing what they've learned</li>
                <li>Are ready to engage with authentic Hebrew texts</li>
              </ul>
            </div>
            <p className="mt-3">
              <strong>Not sure where to start?</strong> The app can generate AI-powered Hebrew passages
              appropriate for your level, so you can practice with content that matches your current abilities.
            </p>
            <p className="mt-2 text-sm">
              If you're just starting to learn the Hebrew alphabet, we recommend working through
<<<<<<< HEAD
              a beginner's course first, then returning to {APP_CONFIG.appName} to build your skills further.
=======
              a beginner's course first, then returning to Learn Ivrit to build your skills further.
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="source-material">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              <span>What sources can I use for Hebrew text?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-700 leading-relaxed">
<<<<<<< HEAD
{APP_CONFIG.appName} supports multiple ways to get Hebrew text for translation and study:
=======
            Learn Ivrit supports multiple ways to get Hebrew text for translation and study:
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0
            <ul className="list-disc ml-6 mt-2 space-y-2">
              <li><strong>Pasted Text:</strong> Copy and paste Hebrew or English text directly into the translation panel</li>
              <li><strong>Bible Chapters:</strong> Load specific biblical passages by book, chapter, and verse range</li>
              <li><strong>From URL:</strong> Enter a web address to extract Hebrew content (note: not all URLs render properly depending on the website structure)</li>
              <li><strong>From Screenshot or Image:</strong> Upload a picture containing Hebrew text and the app will extract the text for you</li>
              <li><strong>AI-Generated Passages:</strong> Generate custom Hebrew passages tailored to your current learning level and topic preferences</li>
              <li><strong>Saved Bookmarks:</strong> Quickly reload passages you've bookmarked for future study</li>
            </ul>
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-900">
                <strong>Pro Tip:</strong> AI-generated passages are perfect for beginners or when you want to practice specific topics at your skill level.
              </p>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="how-translation-works">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <Languages className="w-5 h-5 text-blue-600" />
              <span>How does the translation feature work?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-700 leading-relaxed">
            The translation panel allows you to input Hebrew text and get instant translations. You can:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Click on individual words to see definitions and add them to your vocabulary</li>
              <li>Bookmark passages for later review</li>
              <li>Get context-aware translations powered by AI</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="vocabulary-management">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span>How do I manage my vocabulary?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-700 leading-relaxed">
            The vocabulary section lets you build and maintain your personal Hebrew word list:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Add words manually or from translations</li>
              <li>View Hebrew text, transliteration, and English definitions</li>
              <li>Edit or delete words as needed</li>
              <li>Track your confidence level for each word</li>
              <li>See which words need more practice</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="adaptive-testing">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <span>What is adaptive testing?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-700 leading-relaxed">
            Our adaptive testing system intelligently selects words based on your performance:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Words you struggle with appear more frequently</li>
              <li>Well-known words are tested less often</li>
              <li>Three test modes: flashcards, multiple choice, and fill-in-the-blank</li>
              <li>Your confidence scores update automatically based on your answers</li>
              <li>Progress is tracked over time in your dashboard</li>
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="guest-vs-account">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span>Do I need an account or can I use it as a guest?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-700 leading-relaxed">
<<<<<<< HEAD
            You can explore {APP_CONFIG.appName} as a guest to try out the translation and testing features.
=======
            You can explore Learn Ivrit as a guest to try out the translation and testing features.
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0
            However, without an account, no data is stored - you cannot save vocabulary, bookmarks, or track progress.
            The vocabulary list you see as a guest is populated with basic words for display purposes only.
            <div className="mt-3 p-3 bg-blue-50 rounded-lg">
              <p className="font-medium text-blue-900">Creating an account gives you:</p>
              <ul className="list-disc ml-6 mt-1 space-y-1 text-blue-800">
                <li>Ability to save and manage your vocabulary</li>
                <li>Permanent cloud storage of your progress and test results</li>
                <li>Access your data from any device</li>
                <li>Detailed statistics and learning analytics</li>
                <li>Bookmark management across devices</li>
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="privacy">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
              <span>Is my data private and secure?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-700 leading-relaxed">
            We take your privacy seriously:
            <ul className="list-disc ml-6 mt-2 space-y-1">
              <li>Your data is protected from other users through security policies</li>
              <li>Service administrators have access to all data for operations and support</li>
              <li>We commit to only access data for legitimate operational or legal reasons</li>
              <li>We never sell your personal information to third parties</li>
              <li>You can delete your account and all data at any time</li>
            </ul>
            <p className="mt-3 text-sm text-gray-600">
<<<<<<< HEAD
              See our{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-700 underline"
              >
                Privacy Policy
              </a>
              {' '}for full details about data access and our commitments.
=======
              See our Privacy Policy (accessible from Settings) for full details about data access and our commitments.
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0
            </p>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="free">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-blue-600" />
<<<<<<< HEAD
              <span>Is {APP_CONFIG.appName} free to use?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-700 leading-relaxed">
            Yes, {APP_CONFIG.appName} is currently free to use. We're committed to making Hebrew
=======
              <span>Is Learn Ivrit free to use?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-700 leading-relaxed">
            Yes, Learn Ivrit is currently free to use. We're committed to making Hebrew
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0
            accessible to everyone who wants to learn. All core features including translation,
            vocabulary management, and adaptive testing are available at no cost.
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="getting-started">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              <span>How do I get started?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-700 leading-relaxed">
            Getting started is easy:
            <ol className="list-decimal ml-6 mt-2 space-y-1">
              <li>Create a free account or continue as a guest</li>
              <li>Go to the Translation panel and generate or paste Hebrew text</li>
              <li>Click on words to see definitions and add them to your vocabulary</li>
              <li>Review your vocabulary list and customize it as needed</li>
              <li>Start testing yourself with flashcards or quizzes</li>
              <li>Track your progress in the Dashboard</li>
            </ol>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="support">
          <AccordionTrigger className="text-left">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-600" />
              <span>How do I get help or report an issue?</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="text-gray-700 leading-relaxed">
            If you need assistance or want to report a problem, please contact us at:
            <div className="mt-2 p-3 bg-gray-50 rounded-lg">
              <a
<<<<<<< HEAD
                href={`mailto:${APP_CONFIG.supportEmail}`}
                className="text-blue-600 hover:underline font-medium"
              >
{APP_CONFIG.supportEmail}
=======
                href="mailto:support@yourapp.com"
                className="text-blue-600 hover:underline font-medium"
              >
                support@yourapp.com
>>>>>>> d32ad4fb18ebbecf318508cf4c3df0334cd09fb0
              </a>
            </div>
            <p className="mt-2 text-sm text-gray-600">
              We typically respond within 24-48 hours during business days.
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
