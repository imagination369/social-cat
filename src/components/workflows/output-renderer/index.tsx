'use client';

import { detectOutputDisplay, type OutputDisplayConfig } from '@/lib/workflows/analyze-output-display';
import { DataTable } from './data-table';
import { ImageDisplay, ImageGrid } from './image-display';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import { Button } from '@/components/ui/button';
import { Copy, Download, Check } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import dynamic from 'next/dynamic';

const ReactJson = dynamic(() => import('@microlink/react-json-view'), { ssr: false });

interface OutputRendererProps {
  output: unknown;
  modulePath?: string;
  displayHint?: OutputDisplayConfig;
}

export function OutputRenderer({ output, modulePath, displayHint }: OutputRendererProps) {
  // Auto-parse JSON strings for table display
  // If output is a JSON string and displayHint expects a table, parse it
  let parsedOutput = output;
  if (typeof output === 'string' && displayHint?.type === 'table') {
    try {
      // Try to parse as JSON
      const trimmed = output.trim();
      if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
        parsedOutput = JSON.parse(output);
      }
    } catch (error) {
      // If parsing fails, keep original output
      console.warn('Failed to parse output as JSON:', error);
    }
  }

  // Priority: 1) displayHint from workflow config, 2) module-based detection, 3) structure-based detection
  const display = displayHint || detectOutputDisplay(modulePath || '', parsedOutput);

  switch (display.type) {
    case 'table':
      return <DataTable data={parsedOutput} config={display.config} />;

    case 'image':
      return <ImageDisplay data={output} config={display.config} />;

    case 'images':
      return <ImageGrid data={output} config={display.config} />;

    case 'markdown':
      return <MarkdownDisplay content={output} />;

    case 'text':
      return <TextDisplay content={output} />;

    case 'list':
      return <ListDisplay data={output} />;

    case 'json':
    default:
      return <JSONDisplay data={output} />;
  }
}

// Action buttons component for copy/download
function ActionButtons({ content, filename, format }: { content: string; filename: string; format: 'md' | 'txt' | 'json' | 'csv' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleDownload = () => {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Downloaded as ${filename}.${format}`);
  };

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        variant="outline"
        onClick={handleCopy}
        className="h-8 gap-2"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'Copied' : 'Copy'}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleDownload}
        className="h-8 gap-2"
      >
        <Download className="h-3.5 w-3.5" />
        Download
      </Button>
    </div>
  );
}

function MarkdownDisplay({ content }: { content: unknown }) {
  const text = String(content);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ActionButtons content={text} filename="output" format="md" />
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border/50 bg-surface/50 p-6">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeSanitize]}
        components={{
          // Headers
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold mb-4 mt-6 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-2xl font-semibold mb-3 mt-6 border-b pb-2">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-xl font-semibold mb-2 mt-4">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-lg font-semibold mb-2 mt-3">{children}</h4>
          ),
          // Paragraphs
          p: ({ children }) => (
            <p className="mb-4 leading-7">{children}</p>
          ),
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-4 space-y-2">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-4 space-y-2">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="leading-7">{children}</li>
          ),
          // Code blocks and inline code
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            return isInline ? (
              <code className="px-1.5 py-0.5 rounded bg-muted text-sm font-mono text-foreground" {...props}>
                {children}
              </code>
            ) : (
              <code className="block bg-muted/80 p-4 rounded-lg overflow-x-auto text-sm font-mono mb-4" {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="mb-4">{children}</pre>
          ),
          // Blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 py-2 my-4 bg-muted/30 italic">
              {children}
            </blockquote>
          ),
          // Horizontal rules
          hr: () => (
            <hr className="my-6 border-t-2 border-border" />
          ),
          // Links
          a: ({ href, children, ...props }) => (
            <a
              href={href}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            >
              {children}
            </a>
          ),
          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-bold text-foreground">{children}</strong>
          ),
          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full divide-y divide-border">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-muted/50">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-border">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr>{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-sm font-semibold">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-sm">{children}</td>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
      </div>
    </div>
  );
}

function TextDisplay({ content }: { content: unknown }) {
  const text = String(content);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ActionButtons content={text} filename="output" format="txt" />
      </div>
      <div className="rounded-lg border border-border/50 bg-surface/50 p-4">
        <div className="text-sm whitespace-pre-wrap break-words">{text}</div>
      </div>
    </div>
  );
}

function ListDisplay({ data }: { data: unknown }) {
  if (!Array.isArray(data)) {
    return <div className="text-sm text-muted-foreground">Invalid list data</div>;
  }

  const text = data.map((item) => String(item)).join('\n');

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ActionButtons content={text} filename="list-output" format="txt" />
      </div>
      <div className="rounded-lg border border-border/50 bg-surface/50 p-4">
        <ul className="space-y-2 list-disc list-inside">
          {data.map((item, idx) => (
            <li key={idx} className="text-sm">
              {String(item)}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function JSONDisplay({ data }: { data: unknown }) {
  // Parse data if it's a string
  let jsonData: unknown = data;
  if (typeof data === 'string') {
    try {
      jsonData = JSON.parse(data);
    } catch {
      jsonData = data;
    }
  }

  const jsonString = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <ActionButtons content={jsonString} filename="output" format="json" />
      </div>
      <div className="rounded-lg border border-border/50 bg-muted/20 p-4 overflow-y-auto max-h-[70vh]">
        <ReactJson
          src={jsonData as object}
          theme="monokai"
          iconStyle="circle"
          displayDataTypes={false}
          displayObjectSize={false}
          enableClipboard={true}
          collapsed={2}
          style={{
            backgroundColor: 'transparent',
            fontSize: '0.875rem',
          }}
        />
      </div>
    </div>
  );
}
