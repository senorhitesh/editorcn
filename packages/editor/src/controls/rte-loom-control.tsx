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
    loom: {
      setLoomEmbed: (src: string) => ReturnType;
    };
  }
}

const getLoomEmbedUrl = (url: string) => {
  try {
    const cleanUrl = url.trim();
    if (!cleanUrl) {
      return null;
    }

    if (/^[a-zA-Z0-9_-]{20,40}$/.test(cleanUrl)) {
      return {
        embedUrl: `https://www.loom.com/embed/${cleanUrl}`,
        videoId: cleanUrl,
        watchUrl: `https://www.loom.com/share/${cleanUrl}`,
      };
    }

    const input = new URL(
      cleanUrl.startsWith("http://") || cleanUrl.startsWith("https://")
        ? cleanUrl
        : `https://${cleanUrl}`
    );

    const allowedHosts = ["loom.com", "www.loom.com"];
    if (!allowedHosts.includes(input.hostname)) {
      return null;
    }

    const match = input.pathname.match(
      /^\/(?:share|embed)\/([a-zA-Z0-9_-]+)\/?$/
    );

    if (!match) {
      return null;
    }

    const [, videoId] = match;
    const embedUrl = new URL(`https://www.loom.com/embed/${videoId}`);

    // Preserve Loom session parameters if provided
    for (const [key, value] of input.searchParams.entries()) {
      embedUrl.searchParams.set(key, value);
    }

    return {
      embedUrl: embedUrl.toString(),
      videoId,
      watchUrl: `https://www.loom.com/share/${videoId}`,
    };
  } catch {
    return null;
  }
};

export const LoomNodeView = (props: NodeViewProps) => {
  const { node, updateAttributes } = props;
  const rawSrc = node.attrs.src || "";

  const loom = getLoomEmbedUrl(rawSrc);

  if (!loom) {
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
      watchUrl={loom.watchUrl}
      {...props}
    >
      <iframe
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        className="rte-embed-iframe"
        data-testid="embed-loom"
        loading="lazy"
        src={loom.embedUrl}
        style={{
          height: "100%",
          maxWidth: "100%",
          width: "100%",
        }}
        title="Loom Video"
      />
    </ResizableNodeView>
  );
};

export const LoomEmbed = Node.create({
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
      setLoomEmbed:
        (src: string) =>
        ({ commands }) =>
          commands.insertContent({
            attrs: { src },
            type: "loom",
          }),
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(LoomNodeView);
  },
  atom: true,
  draggable: true,
  group: "block",
  name: "loom",
  parseHTML() {
    return [{ tag: 'div[data-type="loom"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      {
        "data-align": HTMLAttributes["data-align"],
        "data-src": HTMLAttributes["data-src"],
        "data-type": "loom",
      },
      [
        "iframe",
        {
          allowfullscreen: "true",
          class: "rte-embed-iframe",
          loading: "lazy",
          src: HTMLAttributes["data-src"],
        },
      ],
    ];
  },
});

export const LoomEmbedControl = ({ className }: { className?: string }) => {
  const { editor } = useRichTextEditorContext();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const { active } = useEditorState({
    editor: editor ?? null,
    selector: (ctx) => ({
      active:
        ctx.editor && !ctx.editor.isDestroyed
          ? ctx.editor.isActive("loom")
          : false,
    }),
  }) ?? { active: false };

  const handleInsert = useCallback(() => {
    if (url && editor) {
      editor.chain().focus().setLoomEmbed(url).run();
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
            aria-label="Embed Loom Video"
            className={className}
            title="Embed Loom Video"
          >
            <svg
              className="rte-editor-icon"
              fill="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M24 10.665h-7.018l6.078-3.509-1.335-2.312-6.078 3.509 3.508-6.077L16.843.94l-3.508 6.077V0h-2.67v7.018L7.156.94 4.844 2.275l3.509 6.077-6.078-3.508L.94 7.156l6.078 3.509H0v2.67h7.017L.94 16.844l1.335 2.313 6.077-3.508-3.509 6.077 2.312 1.335 3.509-6.078V24h2.67v-7.017l3.508 6.077 2.312-1.335-3.509-6.078 6.078 3.509 1.335-2.313-6.077-3.508h7.017v-2.67H24zm-12 4.966a3.645 3.645 0 1 1 0-7.29 3.645 3.645 0 0 1 0 7.29z" />
            </svg>
          </RichTextEditorControl>
        }
      />
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Embed Loom Video</DialogTitle>
          <DialogDescription>Paste a Loom video URL.</DialogDescription>
        </DialogHeader>
        <Input
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && url) {
              handleInsert();
              setOpen(false);
            }
          }}
          placeholder="https://www.loom.com/share/..."
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
