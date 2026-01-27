import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Footer } from './Footer';

describe('Footer', () => {
  describe('rendering', () => {
    it('renders the footer element', () => {
      const { container } = render(<Footer />);
      const footer = container.querySelector('footer');

      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('bg-white', 'border-t', 'border-gray-200', 'mt-auto');
    });

    it('displays attribution text for translations', () => {
      render(<Footer />);

      expect(screen.getByText('Translations powered by')).toBeInTheDocument();
    });

    it('displays attribution text for biblical texts', () => {
      render(<Footer />);

      expect(screen.getByText('Biblical texts from')).toBeInTheDocument();
    });

    it('renders separator bullet point on larger screens', () => {
      const { container } = render(<Footer />);
      const separator = container.querySelector('.text-gray-400');

      expect(separator).toBeInTheDocument();
      expect(separator).toHaveTextContent('•');
      expect(separator).toHaveClass('hidden', 'sm:inline');
    });
  });

  describe('Google Gemini link', () => {
    it('renders link to Google Gemini API', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: /Google Gemini/i });

      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://ai.google.dev/gemini-api');
    });

    it('opens Google Gemini link in new tab', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: /Google Gemini/i });

      expect(link).toHaveAttribute('target', '_blank');
    });

    it('has security attributes on Google Gemini link', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: /Google Gemini/i });

      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('displays external link icon for Google Gemini', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: /Google Gemini/i });
      const svg = link.querySelector('svg');

      expect(svg).toBeInTheDocument();
    });

    it('has hover styles on Google Gemini link', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: /Google Gemini/i });

      expect(link).toHaveClass('text-blue-600', 'hover:text-blue-700');
    });
  });

  describe('Sefaria link', () => {
    it('renders link to Sefaria', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: /Powered by Sefaria/i });

      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://www.sefaria.org');
    });

    it('opens Sefaria link in new tab', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: /Powered by Sefaria/i });

      expect(link).toHaveAttribute('target', '_blank');
    });

    it('has security attributes on Sefaria link', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: /Powered by Sefaria/i });

      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('displays Sefaria logo image', () => {
      render(<Footer />);
      const image = screen.getByAltText('Powered by Sefaria');

      expect(image).toBeInTheDocument();
      expect(image).toHaveAttribute('src', '/sefaria.png');
    });

    it('has correct image dimensions', () => {
      render(<Footer />);
      const image = screen.getByAltText('Powered by Sefaria');

      expect(image).toHaveClass('h-6');
    });

    it('has hover styles on Sefaria link', () => {
      render(<Footer />);
      const link = screen.getByRole('link', { name: /Powered by Sefaria/i });

      expect(link).toHaveClass('hover:opacity-80');
    });
  });

  describe('responsive layout', () => {
    it('uses responsive container with proper padding', () => {
      const { container } = render(<Footer />);
      const contentDiv = container.querySelector('.max-w-7xl');

      expect(contentDiv).toBeInTheDocument();
      expect(contentDiv).toHaveClass('mx-auto', 'px-4', 'sm:px-6', 'lg:px-8', 'py-4');
    });

    it('has responsive flex layout', () => {
      const { container } = render(<Footer />);
      const flexContainer = container.querySelector('.flex.flex-col');

      expect(flexContainer).toBeInTheDocument();
      expect(flexContainer).toHaveClass('sm:flex-row');
    });

    it('centers content appropriately', () => {
      const { container } = render(<Footer />);
      const flexContainer = container.querySelector('.flex.flex-col');

      expect(flexContainer).toHaveClass('justify-center', 'items-center');
    });
  });

  describe('accessibility', () => {
    it('has proper alt text for Sefaria logo', () => {
      render(<Footer />);
      const image = screen.getByAltText('Powered by Sefaria');

      expect(image).toHaveAccessibleName('Powered by Sefaria');
    });

    it('all links are keyboard accessible', () => {
      render(<Footer />);
      const geminiLink = screen.getByRole('link', { name: /Google Gemini/i });
      const sefariaLink = screen.getByRole('link', { name: /Powered by Sefaria/i });

      expect(geminiLink).toBeVisible();
      expect(sefariaLink).toBeVisible();
    });

    it('uses semantic footer element', () => {
      const { container } = render(<Footer />);
      const footer = container.querySelector('footer');

      expect(footer).toBeInTheDocument();
    });
  });

  describe('styling and visual presentation', () => {
    it('has proper text color for attributions', () => {
      const { container } = render(<Footer />);
      const flexContainer = container.querySelector('.text-gray-600');

      expect(flexContainer).toBeInTheDocument();
    });

    it('uses proper text size', () => {
      const { container } = render(<Footer />);
      const flexContainer = container.querySelector('.text-sm');

      expect(flexContainer).toBeInTheDocument();
    });

    it('applies proper gap spacing', () => {
      const { container } = render(<Footer />);
      const flexContainer = container.querySelector('.gap-4');

      expect(flexContainer).toBeInTheDocument();
    });
  });
});
