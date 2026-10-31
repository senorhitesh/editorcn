import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";
import { useEffect, useMemo, useState } from "react";

import { BubbleMenu } from "./bubble-menu/index";
import {
  CodeSandboxEmbedControl,
  CodeSandBoxEmbedControl,
} from "./controls/rte-codesandbox-control";
import {
  RichTextEditorControl,
  RichTextEditorTooltip,
} from "./controls/rte-control";
import * as controls from "./controls/rte-controls";
import { FigmaEmbedControl } from "./controls/rte-figma-control";
import { LinkControl } from "./controls/rte-link-control";
import { LoomEmbedControl } from "./controls/rte-loom-control";
import { SpotifyEmbedControl } from "./controls/rte-spotify-control";
import { TwitterEmbedControl } from "./controls/rte-twitter-control";
import { VimeoEmbedControl } from "./controls/rte-vimeo-control";
import { YouTubeEmbedControl } from "./controls/rte-youtube-control";
import { DEFAULT_ICONS } from "./icons";
import { DEFAULT_LABELS } from "./labels";
import { Content } from "./rte-content";
import { RichTextEditorContext } from "./rte-context";
import { ControlsGroup } from "./rte-controls-group";
import { Footer } from "./rte-footer";
import { Toolbar } from "./rte-toolbar";
import type { RichTextEditorProps } from "./types";
import { Tooltip, TooltipContent, TooltipProvider } from "./ui/tooltip";
import { cn } from "./ui/utils";

const RichTextEditorRoot = ({
  editor,
  children,
  className,
  labels,
  icons,
  variant = "default",
  editable = true,
}: RichTextEditorProps) => {
  const mergedLabels = useMemo(
    () => ({ ...DEFAULT_LABELS, ...labels }),
    [labels]
  );

  const mergedIcons = useMemo(() => ({ ...DEFAULT_ICONS, ...icons }), [icons]);
  const [tooltip] = useState(() => TooltipPrimitive.createHandle<string>());

  useEffect(() => {
    if (editor && editor.isEditable !== editable) {
      editor.setEditable(editable);
    }
  }, [editor, editable]);

  return (
    <RichTextEditorContext.Provider
      value={{
        editable,
        editor,
        icons: mergedIcons,
        labels: mergedLabels,
        tooltip,
        variant,
      }}
    >
      <div
        className={cn(
          "rte-root",
          variant !== "default" && `rte-root--${variant}`,
          className
        )}
        data-variant={variant}
      >
        <TooltipProvider>
          {children}
          <Tooltip handle={tooltip}>
            {({ payload }) => (
              <TooltipContent side="bottom">{payload as string}</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>
    </RichTextEditorContext.Provider>
  );
};

export const RichTextEditor = Object.assign(RichTextEditorRoot, {
  AlignCenter: controls.AlignCenterControl,
  AlignJustify: controls.AlignJustifyControl,
  AlignLeft: controls.AlignLeftControl,
  AlignRight: controls.AlignRightControl,
  Blockquote: controls.BlockquoteControl,
  Bold: controls.BoldControl,
  BubbleMenu,
  BulletList: controls.BulletListControl,
  ClearFormatting: controls.ClearFormattingControl,
  Code: controls.CodeControl,
  CodeBlock: controls.CodeBlockControl,
  CodeSandBoxEmbed: CodeSandBoxEmbedControl,
  CodeSandboxEmbed: CodeSandboxEmbedControl,
  Content,
  Control: RichTextEditorControl,
  ControlsGroup,
  FigmaEmbed: FigmaEmbedControl,
  Footer,
  H1: controls.H1Control,
  H2: controls.H2Control,
  H3: controls.H3Control,
  H4: controls.H4Control,
  H5: controls.H5Control,
  H6: controls.H6Control,
  Highlight: controls.HighlightControl,
  Hr: controls.HrControl,
  Italic: controls.ItalicControl,
  Link: LinkControl,
  LoomEmbed: LoomEmbedControl,
  OrderedList: controls.OrderedListControl,
  Redo: controls.RedoControl,
  SpotifyEmbed: SpotifyEmbedControl,
  Strikethrough: controls.StrikethroughControl,
  Subscript: controls.SubscriptControl,
  Superscript: controls.SuperscriptControl,
  Toolbar,
  Tooltip: RichTextEditorTooltip,
  TwitterEmbed: TwitterEmbedControl,
  Underline: controls.UnderlineControl,
  Undo: controls.UndoControl,
  Unlink: controls.UnlinkControl,
  VimeoEmbed: VimeoEmbedControl,
  YouTubeEmbed: YouTubeEmbedControl,
});
