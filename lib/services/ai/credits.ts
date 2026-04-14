import { aiActionCosts } from "@/lib/config/plans";
import type { AiAction } from "@/lib/domain/marketplace";

export function getAiCreditCost(action: AiAction) {
  return aiActionCosts[action];
}

export function canAffordAiAction(balance: number, action: AiAction) {
  return balance >= getAiCreditCost(action);
}
