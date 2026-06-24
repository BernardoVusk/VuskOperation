// Registry dos adapters de checkout disponíveis, indexado pelo nome da plataforma usado na
// URL do webhook (`/api/webhooks/checkout/:platform/...`). Wiapy/Lowify entram na Task 12.

import type { CheckoutAdapter } from "./types";
import { hotmart } from "./hotmart";
import { kiwify } from "./kiwify";
import { wiapy } from "./wiapy";
import { lowify } from "./lowify";

export const checkoutAdapters: Record<string, CheckoutAdapter> = {
  hotmart,
  kiwify,
  wiapy,
  lowify,
};

export type { CheckoutAdapter, NormalizedSale } from "./types";
