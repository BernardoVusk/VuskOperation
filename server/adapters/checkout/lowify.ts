// TODO: formato de payload não confirmado — confirmar com a doc oficial da Lowify
// antes de implementar o parse real. Até então, todo evento cai em webhook_events_raw
// com processed=false para inspeção manual.

import type { Request } from "express";
import type { CheckoutAdapter, NormalizedSale } from "./types";

export const lowify: CheckoutAdapter = {
  verifySignature(req: Request, secret: string): boolean {
    console.warn(
      "lowify adapter: signature validation not implemented — payload format not yet confirmed. " +
      "All events will be recorded in webhook_events_raw for manual inspection."
    );
    return true;
  },

  parse(body: any): NormalizedSale | null {
    return null;
  },
};
