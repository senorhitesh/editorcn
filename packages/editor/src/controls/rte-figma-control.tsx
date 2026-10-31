"use client";

import { Node } from "@tiptap/core";
import { ReactNodeViewRenderer, useEditorState } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useCallback, useState } from "react";

import { RichTextEditorControl } from "../controls/rte-control";
import { ResizableNodeView } from "../extensions/resizable-node-view";
import { useRichTextEditorContext } from "../rte-context";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { Input } from "../ui/input";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    figma: {
      setFigmaEmbed: (src: string) => ReturnType;
    };
  }
}

const getFigmaId = (url: string) => {
  const clean = url.trim();
  const patterns = [
    // Figma design files
    /(?:https?:\/\/)?(?:www\.)?figma\.com\/design\/([a-zA-Z0-9]+)/,
    // Figma prototypes
    /(?:https?:\/\/)?(?:www\.)?figma\.com\/proto\/([a-zA-Z0-9]+)/,
    // Figma FigJam boards
    /(?:https?:\/\/)?(?:www\.)?figma\.com\/board\/([a-zA-Z0-9]+)/,
    // Figma community files
    /(?:https?:\/\/)?(?:www\.)?figma\.com\/community\/file\/([a-zA-Z0-9]+)/,
    // Figma slides
    /(?:https?:\/\/)?(?:www\.)?figma\.com\/slides\/([a-zA-Z0-9]+)/,
    // Figma decks
    /(?:https?:\/\/)?(?:www\.)?figma\.com\/deck\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of patterns) {
    const match = clean.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
};

const getFigmaEmbedUrl = (url: string) => {
  try {
    const input = new URL(url.trim());

    if (!["figma.com", "www.figma.com"].includes(input.hostname)) {
      return null;
    }

    const match = input.pathname.match(
      /^\/(design|proto|board|slides|deck)\/([^/]+)(?:\/([^/]+))?\/?$/
    );

    if (!match) {
      return null;
    }

    return {
      fileKey: match[2],
      fileName: match[3] || "",
      nodeUrl: input.searchParams.get("node-id"),
      type: match[1],
    };
  } catch {
    return null;
  }
};

export const FigmaNodeView = (props: NodeViewProps) => {
  const { node, updateAttributes } = props;
  const rawSrc = node.attrs.src || "";

  const figmaId = getFigmaId(rawSrc);
  const figma = getFigmaEmbedUrl(rawSrc);

  if (!figmaId || !figma) {
    return null;
  }

  const { fileKey, fileName, nodeUrl, type } = figma;
  const embedPath = fileName
    ? `${type}/${fileKey}/${fileName}`
    : `${type}/${fileKey}`;
  const embedUrl = new URL(`https://embed.figma.com/${embedPath}`);
  if (nodeUrl) {
    embedUrl.searchParams.set("node-id", nodeUrl);
  }
  embedUrl.searchParams.set("embed-host", "editorcn");

  return (
    <ResizableNodeView
      aspectRatio={16 / 9}
      lockAspect={false}
      maxWidth={1200}
      minWidth={280}
      onSrcChange={(newSrc) => updateAttributes({ src: newSrc })}
      {...props}
    >
      <iframe
        allowFullScreen
        src={embedUrl.toString()}
        style={{
          border: 0,
          height: "100%",
          maxWidth: "100%",
          width: "100%",
        }}
        title="Figma Embed"
      />
    </ResizableNodeView>
  );
};

export const FigmaEmbed = Node.create({
  addAttributes() {
    return {
      align: {
        default: "center",
        parseHTML: (el: HTMLElement) => el.dataset.align || "center",
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-align": attrs.align,
        }),
      },
      height: {
        // Clean default canvas height
        default: 480,
        parseHTML: (el: HTMLElement) =>
          el.dataset.height ? Number(el.dataset.height) : 480,
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-height": attrs.height,
        }),
      },
      src: {
        default: null,
        parseHTML: (el: HTMLElement) => el.dataset.src,
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-src": attrs.src,
        }),
      },
      width: {
        // Numeric width so math works seamlessly
        default: 800,
        parseHTML: (el: HTMLElement) =>
          el.dataset.width ? Number(el.dataset.width) : 800,
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-width": attrs.width,
        }),
      },
    };
  },
  addCommands() {
    return {
      setFigmaEmbed:
        (src: string) =>
        ({ commands }) =>
          commands.insertContent({
            attrs: { src },
            type: "figma",
          }),
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(FigmaNodeView);
  },
  atom: true,
  draggable: true,
  group: "block",
  name: "figma",
  parseHTML() {
    return [{ tag: 'div[data-type="figma"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      {
        "data-align": HTMLAttributes["data-align"],
        "data-src": HTMLAttributes["data-src"],
        "data-type": "figma",
      },
      [
        "iframe",
        {
          allowfullscreen: "true",
          class: "rte-embed-iframe",
          src: HTMLAttributes["data-src"],
        },
      ],
    ];
  },
});

export const FigmaEmbedControl = ({ className }: { className?: string }) => {
  const { editor } = useRichTextEditorContext();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const { active } = useEditorState({
    editor: editor ?? null,
    selector: (ctx) => ({
      active:
        ctx.editor && !ctx.editor.isDestroyed
          ? ctx.editor.isActive("figma")
          : false,
    }),
  }) ?? { active: false };

  const handleInsert = useCallback(() => {
    if (url && editor) {
      editor.chain().focus().setFigmaEmbed(url).run();
      setUrl("");
    }
  }, [url, editor]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <RichTextEditorControl
            active={active}
            aria-label="Embed Figma Frame"
            className={className}
            title="Embed Figma Frame"
          >
            <svg
              className="rte-editor-icon"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M15.852 8.981h-4.588V0h4.588c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.491-4.49 4.491zM12.735 7.51h3.117c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-3.117V7.51zm0 1.471H8.148c-2.476 0-4.49-2.014-4.49-4.49S5.672 0 8.148 0h4.588v8.981zm-4.587-7.51c-1.665 0-3.019 1.355-3.019 3.019s1.354 3.02 3.019 3.02h3.117V1.471H8.148zm4.587 15.019H8.148c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h4.588v8.98zM8.148 8.981c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h3.117V8.981H8.148zM8.172 24c-2.489 0-4.515-2.014-4.515-4.49s2.014-4.49 4.49-4.49h4.588v4.441c0 2.503-2.047 4.539-4.563 4.539zm-.024-7.51a3.023 3.023 0 0 0-3.019 3.019c0 1.665 1.365 3.019 3.044 3.019 1.705 0 3.093-1.376 3.093-3.068v-2.97H8.148zm7.704 0h-.098c-2.476 0-4.49-2.014-4.49-4.49s2.014-4.49 4.49-4.49h.098c2.476 0 4.49 2.014 4.49 4.49s-2.014 4.49-4.49 4.49zm-.097-7.509c-1.665 0-3.019 1.355-3.019 3.019s1.355 3.019 3.019 3.019h.098c1.665 0 3.019-1.355 3.019-3.019s-1.355-3.019-3.019-3.019h-.098z" />
            </svg>
          </RichTextEditorControl>
        }
      />
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Embed Figma Frame</DialogTitle>
          <DialogDescription>Paste a Figma File URL.</DialogDescription>
        </DialogHeader>
        <Input
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && url) {
              handleInsert();
              setOpen(false);
            }
          }}
          placeholder="https://figma.com/design/iHs..."
          value={url}
        />
        <DialogFooter>
          <DialogClose>Cancel</DialogClose>
          <DialogClose
            className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            disabled={!url}
            onClick={handleInsert}
          >
            Insert
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
