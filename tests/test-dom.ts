import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>");

globalThis.window = dom.window as typeof globalThis & Window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.HTMLInputElement = dom.window.HTMLInputElement;
globalThis.Event = dom.window.Event;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: dom.window.navigator,
});
