import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { APP_CONFIG } from '@/config/app';

interface MarkdownPageProps {
  markdownPath: string;
  icon: React.ReactNode;
  title: string;
  showBackButton?: boolean;
}

export function MarkdownPage({ markdownPath, icon, title, showBackButton = true }: MarkdownPageProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(markdownPath)
      .then((response) => response.text())
      .then((text) => {
        const processedText = text
          .replace(/\[CONTACT_EMAIL\]/g, APP_CONFIG.supportEmail)
          .replace(/\[APP_NAME\]/g, APP_CONFIG.appName);
        setContent(processedText);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Error loading markdown:', error);
        setContent('Error loading content. Please try again later.');
        setLoading(false);
      });
  }, [markdownPath]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-4xl">
          <p className="text-center text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const BackButton = () => (
    <Button variant="ghost" onClick={() => navigate(-1)}>
      <ArrowLeft className="h-4 w-4 mr-2" />
      Back to App
    </Button>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        {showBackButton && <BackButton />}

        <Card className="my-4">
          <CardContent className="p-8">
            <div className="flex items-center gap-3 mb-6">
              {icon}
              <h1 className="text-3xl font-bold m-0">{title}</h1>
            </div>

            <div className="markdown-content">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-3xl font-bold mt-8 mb-4 first:mt-0">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-2xl font-bold mt-8 mb-4 first:mt-0">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-xl font-bold mt-6 mb-3">{children}</h3>
                  ),
                  h4: ({ children }) => (
                    <h4 className="text-lg font-bold mt-4 mb-2">{children}</h4>
                  ),
                  p: ({ children }) => (
                    <p className="my-4 leading-7 text-gray-700">{children}</p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-bold text-gray-900">{children}</strong>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc ml-6 my-4 space-y-2">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal ml-6 my-4 space-y-2">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-gray-700 leading-7">{children}</li>
                  ),
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      className="text-blue-600 underline hover:text-blue-800"
                    >
                      {children}
                    </a>
                  ),
                  hr: () => <hr className="my-8 border-gray-300" />,
                  blockquote: ({ children }) => (
                    <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4 text-gray-600">
                      {children}
                    </blockquote>
                  ),
                  code: ({ children }) => (
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-gray-800">
                      {children}
                    </code>
                  ),
                  pre: ({ children }) => (
                    <pre className="bg-gray-100 p-4 rounded my-4 overflow-x-auto">
                      {children}
                    </pre>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {showBackButton && <BackButton />}
      </div>
    </div>
  );
}
