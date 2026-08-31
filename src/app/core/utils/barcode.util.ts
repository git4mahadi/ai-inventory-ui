import JsBarcode from 'jsbarcode';

/** Renders a CODE128 barcode for POS slips and labels. */
export function renderBarcode(
  element: SVGElement | HTMLCanvasElement | HTMLImageElement,
  value: string,
): void {
  const text = value?.trim();
  if (!text) {
    return;
  }

  JsBarcode(element, text, {
    format: 'CODE128',
    displayValue: true,
    font: 'ui-monospace, monospace',
    fontSize: 11,
    height: 42,
    margin: 0,
    width: 1.35,
    textMargin: 2,
  });
}
