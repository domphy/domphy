// Aceternity UI "File Upload" — clean-room reimplementation from the public
// behavior/visual spec only (no upstream source viewed or copied). A large
// bordered drop-zone with a faint background grid that accepts drag-and-drop
// or click-to-browse file selection, and animates a stack of added files in.
//
// The background grid reuses this package's own `retroGrid.ts` idiom (two
// layered `repeating-linear-gradient`s standing in for tiled grid lines,
// resolved through `themeColor()` — not a literal color), with a
// `radial-gradient` `mask-image` fading it out toward the container's edges
// per the spec's own "soft mask" note. Drag state uses a manual enter/leave
// depth counter (rather than trusting a single `dragleave`, which also fires
// when the pointer crosses a child element's boundary) so the active/hover
// state doesn't flicker while dragging across the zone's own content. Newly
// added rows enter via `motion()` with a per-index delay for the spec's
// "cascades in one row at a time" stagger. The "ghost stack" hinting more
// files can be added is two static, faintly rotated outline rectangles
// behind the drop-zone's own front face, nudged further apart on hover via a
// `motion()` `State<MotionKeyframe>` re-animate (this package's
// `layoutTextFlip.ts` badge-width idiom, applied to `rotate`/`x` instead).

import type { DomphyElement, ElementNode, Listener, State, StyleObject } from "@domphy/core";
import { toState } from "@domphy/core";
import { empty, heading, motion, paragraph, small } from "@domphy/ui";
import type { MotionKeyframe } from "@domphy/ui";
import { themeColor, themeDensity, themeSpacing } from "@domphy/theme";

export interface FileUploadProps {
  /** Fires with the full current file list whenever a selection changes. */
  onChange?: (files: File[]) => void;
  /** Alias for {@link FileUploadProps.onChange}, matching the spec's own naming. */
  onFilesSelected?: (files: File[]) => void;
  /** Allows selecting/dropping more than one file at once. Defaults to `true`. */
  multiple?: boolean;
  /** Native `accept` filter, e.g. `"image/*"` or `".pdf,.docx"`. */
  accept?: string;
  /** Maximum number of files kept — extra files (beyond this count) are dropped. */
  maxFiles?: number;
  /** Maximum size per file, in bytes — oversized files are silently excluded. */
  maxSize?: number;
  /** Externally-managed file list to render instead of the component's own internal state. */
  files?: File[];
  /** Extra class name merged onto the outer wrapper's native `class` attribute. */
  className?: string;
  /** Passthrough style merged onto the drop-zone box. */
  style?: StyleObject;
}

const GRID_CELL_PX = 28;
const ROW_STAGGER_MS = 60;

// Visually-hidden but screen-reader-visible label text, matching
// `canvasText.ts`'s own `SR_ONLY_STYLE` idiom.
const SR_ONLY_STYLE = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: "0",
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: "0",
} as const;

let fileUploadInstanceCounter = 0;

function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value >= 10 ? Math.round(value) : Math.round(value * 10) / 10} ${units[unitIndex]}`;
}

/** Loose `accept` matcher covering MIME wildcards (`image/*`), exact MIME types, and file extensions (`.pdf`). */
function matchesAccept(file: File, accept: string | undefined): boolean {
  if (!accept) return true;
  const patterns = accept
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (patterns.length === 0) return true;
  return patterns.some((pattern) => {
    if (pattern.startsWith(".")) return file.name.toLowerCase().endsWith(pattern.toLowerCase());
    if (pattern.endsWith("/*")) return file.type.startsWith(pattern.slice(0, -1));
    return file.type === pattern;
  });
}

/** Cloud-with-upward-arrow glyph, hand-composed — not traced from any icon library. */
function uploadCloudGlyph(): DomphyElement<"span"> {
  return {
    span: [
      {
        svg: [
          {
            path: null,
            d: "M7 18a4 4 0 0 1-.6-7.96A5 5 0 0 1 16.5 8.05 4.5 4.5 0 0 1 16 17H7Z",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.5",
            strokeLinejoin: "round",
          } as DomphyElement,
          {
            path: null,
            d: "M12 11v7M9 14l3-3 3 3",
            fill: "none",
            stroke: "currentColor",
            strokeWidth: "1.5",
            strokeLinecap: "round",
            strokeLinejoin: "round",
          } as DomphyElement,
        ],
        viewBox: "0 0 24 24",
        fill: "none",
        role: "img",
        ariaHidden: "true",
        style: { width: "100%", height: "100%" },
      } as DomphyElement<"svg">,
    ],
    style: { display: "inline-flex", width: themeSpacing(12), height: themeSpacing(12) } as StyleObject,
  };
}

/** Generic document glyph (folded corner), hand-composed — not traced from any icon library. */
function genericFileGlyph(): DomphyElement<"svg"> {
  return {
    svg: [
      { path: null, d: "M6 2h9l5 5v15H6Z", fill: "none", stroke: "currentColor", strokeWidth: "1.3" } as DomphyElement,
      { path: null, d: "M15 2v5h5", fill: "none", stroke: "currentColor", strokeWidth: "1.3" } as DomphyElement,
    ],
    viewBox: "0 0 24 24",
    fill: "none",
    role: "img",
    ariaHidden: "true",
    style: { width: "100%", height: "100%" },
  } as DomphyElement<"svg">;
}

/** Generic image glyph (frame + mountain silhouette), hand-composed — not traced from any icon library. */
function imageFileGlyph(): DomphyElement<"svg"> {
  return {
    svg: [
      { rect: null, x: "3", y: "4", width: "18", height: "16", rx: "2", fill: "none", stroke: "currentColor", strokeWidth: "1.3" } as DomphyElement,
      { circle: null, cx: "8.5", cy: "9.5", r: "1.4", fill: "currentColor" } as DomphyElement,
      {
        path: null,
        d: "M4 17l5-5 4 4 3-3 4 4",
        fill: "none",
        stroke: "currentColor",
        strokeWidth: "1.3",
        strokeLinecap: "round",
        strokeLinejoin: "round",
      } as DomphyElement,
    ],
    viewBox: "0 0 24 24",
    fill: "none",
    role: "img",
    ariaHidden: "true",
    style: { width: "100%", height: "100%" },
  } as DomphyElement<"svg">;
}

/** Two layered `repeating-linear-gradient`s (horizontal + vertical hairlines) standing in for a tiled grid-line background image. */
function buildGridBackgroundImage(lineColor: string): string {
  // Zero-length gradient stops are written unitless ("0", not "0px") — CSS
  // allows a bare zero for any `<length>`, and stylelint's own
  // `length-zero-no-unit` rule (part of this package's doctor Layer 4 audit)
  // flags the unit otherwise.
  const vertical = `repeating-linear-gradient(90deg, ${lineColor} 0, ${lineColor} 1px, transparent 1px, transparent ${GRID_CELL_PX}px)`;
  const horizontal = `repeating-linear-gradient(0deg, ${lineColor} 0, ${lineColor} 1px, transparent 1px, transparent ${GRID_CELL_PX}px)`;
  return `${vertical}, ${horizontal}`;
}

interface FileEntry {
  key: string;
  file: File;
}

function fileRow(entry: FileEntry, index: number): DomphyElement<"div"> {
  const isImage = entry.file.type.startsWith("image/");
  return {
    div: [
      {
        span: [isImage ? imageFileGlyph() : genericFileGlyph()],
        style: {
          flexShrink: 0,
          width: themeSpacing(6),
          height: themeSpacing(6),
          color: (listener: Listener) => themeColor(listener, "shift-8", "neutral"),
        } as StyleObject,
      },
      {
        div: [
          { p: entry.file.name, $: [paragraph({ color: "neutral" })], style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } as StyleObject },
          { small: `${formatFileSize(entry.file.size)}${entry.file.type ? ` · ${entry.file.type}` : ""}`, $: [small({ color: "neutral" })] },
        ],
        style: { display: "flex", flexDirection: "column", gap: themeSpacing(0.5), minWidth: 0, flex: "1 1 auto" } as StyleObject,
      },
    ],
    _key: entry.key,
    style: {
      display: "flex",
      alignItems: "center",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
      borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
      backgroundColor: (listener: Listener) => themeColor(listener, "shift-1", "neutral"),
      color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
      outlineOffset: "-1px",
    } as StyleObject,
    $: [
      motion({
        initial: { opacity: 0, y: "0.75em" },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 260, delay: index * ROW_STAGGER_MS, easing: "ease-out" },
      }),
    ],
  };
}

/** One faint rotated outline rectangle standing behind the drop-zone's front face, part of the "more files can be added" ghost stack. */
function ghostCard(depthIndex: number, nudge: State<MotionKeyframe>): DomphyElement<"div"> {
  return {
    div: null,
    ariaHidden: "true",
    // Purely decorative outline shape with no text of its own — never reads
    // its own `color`, so the missing-color contract doesn't apply.
    // `_doctorDisable` is a doctor-only annotation not present in core's
    // strict `PartialElement` type — build through an untyped literal, then
    // assert (mirrors `pixelatedCanvas.ts`).
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * 6),
      outline: (listener: Listener) => `1px solid ${themeColor(listener, "shift-3", "neutral")}`,
      outlineOffset: "-1px",
      opacity: 0.4 - depthIndex * 0.12,
      zIndex: -depthIndex,
    } as StyleObject,
    $: [motion({ animate: nudge, transition: { duration: 220, easing: "ease-out" } })],
  } as unknown as DomphyElement<"div">;
}

/**
 * A large bordered drop-zone with a faint background grid that accepts
 * drag-and-drop or click-to-browse file selection, animating added files in
 * as a cascading list. Call with no arguments for a working empty demo.
 */
function fileUpload(props: FileUploadProps = {}): DomphyElement<"div"> {
  const instanceId = ++fileUploadInstanceCounter;
  const inputId = `domphy-file-upload-${instanceId}`;
  const multiple = props.multiple ?? true;
  const accept = props.accept;
  const maxFiles = props.maxFiles;
  const maxSize = props.maxSize;
  const onChange = props.onChange ?? props.onFilesSelected;
  const isControlled = props.files !== undefined;

  const files = toState<File[]>(props.files ?? []);
  const isDraggingOver = toState(false);

  const ghostNudgeFar = toState<MotionKeyframe>({ y: "0px", rotate: "-6deg" });
  const ghostNudgeNear = toState<MotionKeyframe>({ y: "0px", rotate: "-3deg" });

  let fileInputElement: HTMLInputElement | null = null;
  let dropZoneDomElement: HTMLElement | null = null;
  let dragDepth = 0;

  function commitFiles(nextFiles: File[]): void {
    if (!isControlled) files.set(nextFiles);
    onChange?.(nextFiles);
  }

  function addFiles(candidateFiles: File[]): void {
    const accepted = candidateFiles.filter((file) => {
      if (!matchesAccept(file, accept)) return false;
      if (typeof maxSize === "number" && file.size > maxSize) return false;
      return true;
    });
    if (accepted.length === 0) return;

    const existing = files.get();
    const merged = multiple ? [...existing, ...accepted] : accepted.slice(0, 1);
    const limited = typeof maxFiles === "number" ? merged.slice(0, maxFiles) : merged;
    commitFiles(limited);
  }

  function openFilePicker(): void {
    fileInputElement?.click();
  }

  const srOnlyLabel: DomphyElement<"label"> = {
    label: "Upload files",
    for: inputId,
    style: SR_ONLY_STYLE as StyleObject,
  };

  const hiddenFileInput: DomphyElement<"input"> = {
    input: null,
    type: "file",
    id: inputId,
    multiple,
    accept,
    ariaHidden: "true",
    tabindex: -1,
    onChange: (event: Event) => {
      const selected = Array.from((event.target as HTMLInputElement).files ?? []);
      addFiles(selected);
      (event.target as HTMLInputElement).value = "";
    },
    _onMount: (node: ElementNode) => {
      fileInputElement = node.domElement as HTMLInputElement;
    },
    style: {
      position: "absolute",
      width: 0,
      height: 0,
      opacity: 0,
      overflow: "hidden",
      pointerEvents: "none",
    } as StyleObject,
  };

  const gridPatternLayer = {
    div: null,
    ariaHidden: "true",
    // `_doctorDisable` is a doctor-only annotation not present in core's
    // strict `PartialElement` type — build through an untyped literal, then
    // assert (mirrors `pixelatedCanvas.ts`).
    _doctorDisable: "missing-color",
    style: {
      position: "absolute",
      inset: 0,
      pointerEvents: "none",
      backgroundImage: (listener: Listener) => buildGridBackgroundImage(themeColor(listener, "shift-3", "neutral")),
      backgroundSize: `${GRID_CELL_PX}px ${GRID_CELL_PX}px`,
      maskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
      WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 85%)",
    } as StyleObject,
  } as unknown as DomphyElement<"div">;

  const centeredContent: DomphyElement<"div"> = {
    div: [
      uploadCloudGlyph(),
      { h3: "Drag & drop files here", $: [heading()] },
      { small: "or click anywhere in this box to browse", $: [small({ color: "neutral" })] },
    ],
    style: { position: "relative", zIndex: 1 } as StyleObject,
    $: [empty()],
  };

  const fileListContainer: DomphyElement<"div"> = {
    div: (listener: Listener) => files.get(listener).map((file, index) => fileRow({ key: `${file.name}-${file.size}-${file.lastModified}-${index}`, file }, index)),
    style: {
      position: "relative",
      zIndex: 1,
      display: "flex",
      flexDirection: "column",
      gap: (listener: Listener) => themeSpacing(themeDensity(listener) * 2),
      width: "100%",
      maxWidth: themeSpacing(140),
      marginTop: themeSpacing(4),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 6),
      paddingBottom: (listener: Listener) => themeSpacing(themeDensity(listener) * 6),
    } as StyleObject,
  };

  // Reactive drag-hover scale nudge — a dedicated `State<MotionKeyframe>`
  // written alongside `isDraggingOver` in the drag handlers below, and
  // consumed by the `motion()` patch on `dropZone` itself.
  const dropZoneScale = toState<MotionKeyframe>({ scale: 1 });

  const dropZone: DomphyElement<"div"> = {
    div: [gridPatternLayer, centeredContent, fileListContainer],
    role: "button",
    tabindex: 0,
    ariaLabel: "Upload files",
    onClick: openFilePicker,
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openFilePicker();
      }
    },
    _onMount: (node: ElementNode) => {
      dropZoneDomElement = node.domElement as HTMLElement;
      if (typeof window === "undefined") return;

      const handleDragEnter = (event: DragEvent) => {
        event.preventDefault();
        dragDepth += 1;
        isDraggingOver.set(true);
        dropZoneScale.set({ scale: 1.02 });
      };
      const handleDragOver = (event: DragEvent) => {
        event.preventDefault();
      };
      const handleDragLeave = (event: DragEvent) => {
        event.preventDefault();
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0) {
          isDraggingOver.set(false);
          dropZoneScale.set({ scale: 1 });
        }
      };
      const handleDrop = (event: DragEvent) => {
        event.preventDefault();
        dragDepth = 0;
        isDraggingOver.set(false);
        dropZoneScale.set({ scale: 1 });
        const dropped = Array.from(event.dataTransfer?.files ?? []);
        addFiles(dropped);
      };

      dropZoneDomElement.addEventListener("dragenter", handleDragEnter);
      dropZoneDomElement.addEventListener("dragover", handleDragOver);
      dropZoneDomElement.addEventListener("dragleave", handleDragLeave);
      dropZoneDomElement.addEventListener("drop", handleDrop);

      node.addHook("Remove", () => {
        dropZoneDomElement?.removeEventListener("dragenter", handleDragEnter);
        dropZoneDomElement?.removeEventListener("dragover", handleDragOver);
        dropZoneDomElement?.removeEventListener("dragleave", handleDragLeave);
        dropZoneDomElement?.removeEventListener("drop", handleDrop);
      });
    },
    style: {
      position: "relative",
      zIndex: 1,
      overflow: "hidden",
      cursor: "pointer",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      borderRadius: (listener: Listener) => themeSpacing(themeDensity(listener) * 6),
      outline: (listener: Listener) =>
        `1px dashed ${themeColor(listener, isDraggingOver.get(listener) ? "shift-8" : "shift-4", isDraggingOver.get(listener) ? "primary" : "neutral")}`,
      outlineOffset: "-1px",
      backgroundColor: (listener: Listener) => themeColor(listener, "inherit", "neutral"),
      color: (listener: Listener) => themeColor(listener, "shift-9", "neutral"),
      transition: "outline-color 180ms ease",
      ...(props.style ?? {}),
    } as StyleObject,
    $: [motion({ animate: dropZoneScale, transition: { duration: 200, easing: "ease-out" } })],
  };

  return {
    // `srOnlyLabel`/`hiddenFileInput` are siblings of `dropZone`, not its
    // children — `dropZone` carries `role="button"`, and a native `<input>`
    // nested inside it failed axe-core's `nested-interactive` check (two
    // interactive controls, one inside the other) even though the input is
    // aria-hidden/tabindex=-1. `openFilePicker()` only needs the DOM
    // reference captured in `hiddenFileInput`'s `_onMount`, not DOM nesting.
    div: [srOnlyLabel, hiddenFileInput, ghostCard(2, ghostNudgeFar), ghostCard(1, ghostNudgeNear), dropZone],
    class: props.className,
    onPointerEnter: () => {
      ghostNudgeFar.set({ y: "-6px", rotate: "-9deg" });
      ghostNudgeNear.set({ y: "-4px", rotate: "-5deg" });
    },
    onPointerLeave: () => {
      ghostNudgeFar.set({ y: "0px", rotate: "-6deg" });
      ghostNudgeNear.set({ y: "0px", rotate: "-3deg" });
    },
    style: {
      position: "relative",
      width: "100%",
      paddingBlock: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
      paddingInline: (listener: Listener) => themeSpacing(themeDensity(listener) * 3),
    } as StyleObject,
  };
}

export { fileUpload };
