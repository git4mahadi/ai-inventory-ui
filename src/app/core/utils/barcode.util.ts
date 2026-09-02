import JsBarcode from 'jsbarcode';

export type BarcodeRenderOptions = {
  height?: number;
  width?: number;
  fontSize?: number;
  margin?: number;
  textMargin?: number;
};

/** Renders a CODE128 barcode for POS slips and labels. */
export function renderBarcode(
  element: SVGElement | HTMLCanvasElement | HTMLImageElement,
  value: string,
  options?: BarcodeRenderOptions,
): void {
  const text = value?.trim();
  if (!text) {
    return;
  }

  JsBarcode(element, text, {
    format: 'CODE128',
    displayValue: true,
    font: 'ui-monospace, monospace',
    fontSize: options?.fontSize ?? 11,
    height: options?.height ?? 42,
    margin: options?.margin ?? 0,
    width: options?.width ?? 1.35,
    textMargin: options?.textMargin ?? 2,
  });
}
