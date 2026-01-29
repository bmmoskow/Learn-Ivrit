import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Footer } from './Footer';

const renderFooter = () => {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>
  );
};

describe('Footer', () => {
  describe('rendering', () => {
    it('renders the footer element', () => {
      const { container } = renderFooter();
      const footer = container.querySelector('footer');

      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('bg-white', 'border-t', 'border-gray-200', 'mt-auto');
    });

    it('displays attribution text for translations', () => {
      renderFooter();

      expect(screen.getByText('Translations powered by')).toBeInTheDocument();
    });

    it('displays attribution text for biblical texts', () => {
      renderFooter();

      expect(screen.getByText('Biblical texts from')).toBeInTheDocument();
    });

    it('renders separator bullet point on larger screens', () => {
      const { container } = renderFooter();
      const separators = container.querySelectorAll('.text-gray-400');

      expect(separators.length).toBeGreaterThan(0);
      const firstSeparator = Array.from(separators).find(el => el.textContent === '•');
      expect(firstSeparator).toBeInTheDocument();
      expect(firstSeparator).toHaveClass('hidden', 'sm:inline');
    });
  });

  describe('Google Gemini link', () => {
    it('renders link to Google Gemini API', () => {
      renderFooter();
      const link = screen.getByRole('link', { name: /Google Gemini/i });

      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://ai.google.dev/gemini-api');
    });

    it('opens Google Gemini link in new tab', () => {
      renderFooter();
      const link = screen.getByRole('link', { name: /Google Gemini/i });

      expect(link).toHaveAttribute('target', '_blank');
    });

    it('has security attributes on Google Gemini link', () => {
      renderFooter();
      const link = screen.getByRole('link', { name: /Google Gemini/i });

      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('displays external link icon for Google Gemini', () => {
      renderFooter();
      const link = screen.getByRole('link', { name: /Google Gemini/i });
      const svg = link.querySelector('svg');

      expect(svg).toBeInTheDocument();
    });

    it('has hover styles on Google Gemini link', () => {
      renderFooter();
      const link = screen.getByRole('link', { name: /Google Gemini/i });

      expect(link).toHaveClass('text-blue-600', 'hover:text-blue-700');
    });
  });

  describe('Sefaria link', () => {
    it('renders link to Sefaria', () => {
      renderFooter();
      const link = screen.getByRole('link', { name: /Powered by Sefaria/i });

      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://www.sefaria.org');
    });

    it('opens Sefaria link in new tab', () => {
      renderFooter();
      const link = screen.getByRole('link', { name: /Powered by Sefaria/i });

      expect(link).toHaveAttribute('target', '_blank');
    });

    it('has security attributes on Sefaria link', () => {
      renderFooter();
      const link = screen.getByRole('link', { name: /Powered by Sefaria/i });

      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('displays Sefaria logo image', () => {
      renderFooter();
      const image = screen.getByAltText('Powered by Sefaria');

      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/sefaria.png');
    });

    it('has correct image dimensions', () => {
      renderFooter();
      const image = screen.getByAltText('Powered by Sefaria');

      expect(image).toHaveClass('h-6');
    });

    it('has hover styles on Sefaria link', () => {
      renderFooter();
      const link = screen.getByRole('link', { name: /Powered by Sefaria/i });

      expect(link).toHaveClass('hover:opacity-80');
    });
  });

  describe('legal links', () => {
    it('renders Terms of Service link', () => {
      renderFooter();
      const link = screen.getByRole('link', { name: /Terms of Service/i });

      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/terms');
    });

    it('renders Privacy Policy link', () => {
      renderFooter();
      const link = screen.getByRole('link', { name: /Privacy Policy/i });

      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/privacy');
    });

    it('has hover styles on Terms of Service link', () => {
      renderFooter();
      const link = screen.getByRole('link', { name: /Terms of Service/i });

      expect(link).toHaveClass('hover:text-blue-600');
    });

    it('has hover styles on Privacy Policy link', () => {
      renderFooter();
      const link = screen.getByRole('link', { name: /Privacy Policy/i });

      expect(link).toHaveClass('hover:text-blue-600');
    });

    it('renders separator between legal links', () => {
      const { container } = renderFooter();
      const legalLinksContainer = container.querySelector('.text-xs.text-gray-500');

      expect(legalLinksContainer).toBeInTheDocument();
      expect(legalLinksContainer?.textContent).toContain('•');
    });

    it('legal links have proper text size', () => {
      const { container } = renderFooter();
      const legalLinksContainer = container.querySelector('.text-xs');

      expect(legalLinksContainer).toBeInTheDocument();
      expect(legalLinksContainer).toHaveClass('text-gray-500');
    });
  });

  describe('responsive layout', () => {
    it('uses responsive container with proper padding', () => {
      const { container } = renderFooter();
      const contentDiv = container.querySelector('.max-w-7xl');

      expect(contentDiv).toBeInTheDocument();
      expect(contentDiv).toHaveClass('mx-auto', 'px-4', 'sm:px-6', 'lg:px-8', 'py-4');
    });

    it('has responsive flex layout', () => {
      const { container } = renderFooter();
      const attributionsContainer = container.querySelector('.flex.flex-col.sm\\:flex-row');

      expect(attributionsContainer).toBeInTheDocument();
    });

    it('centers content appropriately', () => {
      const { container } = renderFooter();
      const mainContainer = container.querySelector('.flex.flex-col.items-center');

      expect(mainContainer).toBeInTheDocument();
      expect(mainContainer).toHaveClass('items-center');
    });
  });

  describe('accessibility', () => {
    it('has proper alt text for Sefaria logo', () => {
      renderFooter();
      const image = screen.getByAltText('Powered by Sefaria');

      expect(image).toHaveAccessibleName('Powered by Sefaria');
    });

    it('all links are keyboard accessible', () => {
      renderFooter();
      const geminiLink = screen.getByRole('link', { name: /Google Gemini/i });
      const sefariaLink = screen.getByRole('link', { name: /Powered by Sefaria/i });
      const termsLink = screen.getByRole('link', { name: /Terms of Service/i });
      const privacyLink = screen.getByRole('link', { name: /Privacy Policy/i });

      expect(geminiLink).toBeVisible();
      expect(sefariaLink).toBeVisible();
      expect(termsLink).toBeVisible();
      expect(privacyLink).toBeVisible();
    });

    it('uses semantic footer element', () => {
      const { container } = renderFooter();
      const footer = container.querySelector('footer');

      expect(footer).toBeInTheDocument();
    });
  });

  describe('styling and visual presentation', () => {
    it('has proper text color for attributions', () => {
      const { container } = renderFooter();
      const flexContainer = container.querySelector('.text-gray-600');

      expect(flexContainer).toBeInTheDocument();
    });

    it('uses proper text size', () => {
      const { container } = renderFooter();
      const flexContainer = container.querySelector('.text-sm');

      expect(flexContainer).toBeInTheDocument();
    });

    it('applies proper gap spacing', () => {
      const { container } = renderFooter();
      const flexContainer = container.querySelector('.gap-4');

      expect(flexContainer).toBeInTheDocument();
    });
  });
});
