import {
  $getState,
  $setState,
  createState,
  type ElementNode,
} from "lexical";

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export const smartMedContentIdState = createState("smartmedId", {
  parse(value): string {
    return typeof value === "string" && uuidPattern.test(value) ? value : "";
  },
  resetOnCopyNode: true,
});

export function $getSmartMedContentId(node: ElementNode): string {
  return $getState(node, smartMedContentIdState);
}

export function $ensureSmartMedContentId<T extends ElementNode>(node: T): T {
  return $getSmartMedContentId(node)
    ? node
    : $setState(node, smartMedContentIdState, crypto.randomUUID());
}

export function $copySmartMedContentId(
  previousNode: ElementNode,
  nextNode: ElementNode,
): void {
  $setState(
    nextNode,
    smartMedContentIdState,
    $getSmartMedContentId(previousNode) || crypto.randomUUID(),
  );
}
