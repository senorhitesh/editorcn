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
    vimeo: {
      setVimeoEmbed: (src: string) => ReturnType;
    };
  }
}

const getVimeoEmbedUrl = (url: string) => {
  try {
    const clean = url.trim();
    if (!clean) {
      return null;
    }

    if (/^\d+$/.test(clean)) {
      return {
        embedUrl: `https://player.vimeo.com/video/${clean}`,
        videoId: clean,
        watchUrl: `https://vimeo.com/${clean}`,
      };
    }

    const input = new URL(
      clean.startsWith("http://") || clean.startsWith("https://")
        ? clean
        : `https://${clean}`
    );

    const allowedHosts = ["vimeo.com", "www.vimeo.com", "player.vimeo.com"];
    if (!allowedHosts.includes(input.hostname)) {
      return null;
    }

    // Player URL: player.vimeo.com/video/123456789
    const playerMatch = input.pathname.match(/^\/video\/(\d+)\/?$/);
    if (playerMatch) {
      const [, videoId] = playerMatch;
      const privacyHash = input.searchParams.get("h");
      const embedUrl = new URL(`https://player.vimeo.com/video/${videoId}`);
      if (privacyHash) {
        embedUrl.searchParams.set("h", privacyHash);
      }
      return {
        embedUrl: embedUrl.toString(),
        privacyHash,
        videoId,
        watchUrl: `https://vimeo.com/${videoId}${privacyHash ? `/${privacyHash}` : ""}`,
      };
    }

    // Regular URL: vimeo.com/123456789 or unlisted vimeo.com/123456789/hash
    const match = input.pathname.match(
      /(?:^|\/)(\d+)(?:\/([a-zA-Z0-9]+))?\/?$/
    );
    if (!match) {
      return null;
    }

    const [, videoId, matchHash] = match;
    const privacyHash = matchHash ?? input.searchParams.get("h") ?? null;
    const embedUrl = new URL(`https://player.vimeo.com/video/${videoId}`);
    if (privacyHash) {
      embedUrl.searchParams.set("h", privacyHash);
    }
    return {
      embedUrl: embedUrl.toString(),
      privacyHash,
      videoId,
      watchUrl: clean,
    };
  } catch {
    return null;
  }
};

export const VimeoNodeView = (props: NodeViewProps) => {
  const { node, updateAttributes } = props;
  const rawSrc = node.attrs.src || "";

  const vimeo = getVimeoEmbedUrl(rawSrc);

  if (!vimeo) {
    return null;
  }

  return (
    <ResizableNodeView
      aspectRatio={16 / 9}
      lockAspect
      maxWidth={1200}
      minWidth={320}
      onSrcChange={(newSrc) => updateAttributes({ src: newSrc })}
      videoSrc={rawSrc}
      watchUrl={vimeo.watchUrl}
      {...props}
    >
      <iframe
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="rte-embed-iframe"
        data-testid="embed-vimeo"
        loading="lazy"
        src={vimeo.embedUrl}
        style={{
          height: "100%",
          maxWidth: "100%",
          width: "100%",
        }}
        title="Vimeo Video"
      />
    </ResizableNodeView>
  );
};

export const VimeoEmbed = Node.create({
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
        default: 315,
        parseHTML: (el: HTMLElement) =>
          el.dataset.height ? Number(el.dataset.height) : 315,
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
        default: 560,
        parseHTML: (el: HTMLElement) =>
          el.dataset.width ? Number(el.dataset.width) : 560,
        renderHTML: (attrs: Record<string, unknown>) => ({
          "data-width": attrs.width,
        }),
      },
    };
  },
  addCommands() {
    return {
      setVimeoEmbed:
        (src: string) =>
        ({ commands }) =>
          commands.insertContent({
            attrs: { src },
            type: "vimeo",
          }),
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(VimeoNodeView);
  },
  atom: true,
  draggable: true,
  group: "block",
  name: "vimeo",
  parseHTML() {
    return [{ tag: 'div[data-type="vimeo"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      {
        "data-align": HTMLAttributes["data-align"],
        "data-src": HTMLAttributes["data-src"],
        "data-type": "vimeo",
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

export const VimeoEmbedControl = ({ className }: { className?: string }) => {
  const { editor } = useRichTextEditorContext();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const { active } = useEditorState({
    editor: editor ?? null,
    selector: (ctx) => ({
      active:
        ctx.editor && !ctx.editor.isDestroyed
          ? ctx.editor.isActive("vimeo")
          : false,
    }),
  }) ?? { active: false };

  const handleInsert = useCallback(() => {
    if (url && editor) {
      editor.chain().focus().setVimeoEmbed(url).run();
      setUrl("");
      setOpen(false);
    }
  }, [url, editor]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogTrigger
        render={
          <RichTextEditorControl
            active={active}
            aria-label="Embed Vimeo Video"
            className={className}
            title="Embed Vimeo Video"
          >
            <svg
              className="rte-editor-icon"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M23.9765 6.4168c-.105 2.338-1.739 5.5429-4.894 9.6088-3.2679 4.247-6.0258 6.3699-8.2898 6.3699-1.409 0-2.578-1.294-3.553-3.881l-1.9179-7.1138c-.719-2.584-1.488-3.878-2.312-3.878-.179 0-.806.378-1.8809 1.132l-1.129-1.457a315.06 315.06 0 003.501-3.1279c1.579-1.368 2.765-2.085 3.5539-2.159 1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.5069.5389 2.45 1.1309 3.674 1.7759 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.8679 3.434-5.7568 6.7619-5.6368 2.4729.06 3.6279 1.664 3.4929 4.7969z" />
            </svg>
          </RichTextEditorControl>
        }
      />
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Embed Vimeo Video</DialogTitle>
          <DialogDescription>Paste a Vimeo video URL.</DialogDescription>
        </DialogHeader>
        <Input
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && url) {
              handleInsert();
              setOpen(false);
            }
          }}
          placeholder="https://vimeo.com/123..."
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
