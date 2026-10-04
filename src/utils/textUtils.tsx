import React from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * Universal URL & Link Regex
 * Matches http://, https://, ftp://, www., and common domain structures
 */
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9.-]+\.(?:com|lk|org|net|io|me|co|app|site|online|info|xyz|shop|gov|edu)(?:\/[^\s]*)?)/gi;

/**
 * Parses a string containing URLs and returns React elements where URLs are clickable hyperlinks.
 * Keeps text safe and styles links cleanly.
 */
export function renderTextWithLinks(text: string | undefined | null, customLinkClass?: string): React.ReactNode {
  if (!text) return text || '';

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex index
  URL_REGEX.lastIndex = 0;

  while ((match = URL_REGEX.exec(text)) !== null) {
    const matchedUrl = match[0];
    const matchIndex = match.index;

    // Push preceding text if any
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    // Determine href
    let href = matchedUrl;
    if (!/^https?:\/\//i.test(href)) {
      href = `https://${href}`;
    }

    // Clean display text (strip trailing punctuation if caught by regex)
    let cleanUrl = matchedUrl;
    let trailingPunctuation = '';
    const trailingPunctuationMatch = /[.,;!?]+$/.exec(cleanUrl);
    if (trailingPunctuationMatch) {
      trailingPunctuation = trailingPunctuationMatch[0];
      cleanUrl = cleanUrl.slice(0, -trailingPunctuation.length);
      href = href.slice(0, -trailingPunctuation.length);
    }

    parts.push(
      <a
        key={`link-${matchIndex}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={
          customLinkClass ||
          'inline-flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold underline underline-offset-2 break-all hover:opacity-90 transition-colors'
        }
        title={`Open ${href}`}
      >
        <span>{cleanUrl}</span>
        <ExternalLink className="w-3 h-3 inline-block shrink-0 ml-0.5" />
      </a>
    );

    if (trailingPunctuation) {
      parts.push(trailingPunctuation);
    }

    lastIndex = matchIndex + matchedUrl.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? <>{parts}</> : text;
}
