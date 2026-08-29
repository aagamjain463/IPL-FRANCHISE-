import { Player } from '../types/cricket';
import { Team } from '../types/team';

export interface TradeOffer {
  id: string;
  offeringTeamId: string;
  receivingTeamId: string;
  offeredPlayerIds: string[];
  requestedPlayerIds: string[];
  cashAdjustmentCr: number; // Positive if offering team pays cash
  status: 'Pending' | 'Accepted' | 'Rejected';
  aiFeedback: string;
}

export function evaluateTradeProposal(
  offer: TradeOffer,
  teams: Record<string, Team>,
  allPlayers: Record<string, Player>
): { accepted: boolean; aiFeedback: string } {
  const receivingTeam = teams[offer.receivingTeamId];
  if (!receivingTeam) return { accepted: false, aiFeedback: 'Invalid team.' };

  const offeredPlayers = offer.offeredPlayerIds.map(id => allPlayers[id]).filter(Boolean);
  const requestedPlayers = offer.requestedPlayerIds.map(id => allPlayers[id]).filter(Boolean);

  if (offeredPlayers.length === 0 || requestedPlayers.length === 0) {
    return { accepted: false, aiFeedback: 'Both sides must offer at least one player.' };
  }

  // Calculate value delivered to receiving team
  let valOffered = offeredPlayers.reduce((acc, p) => {
    let pVal = p.overall * 1.5;
    if (p.age <= 24) pVal += (p.potential - p.overall) * 0.8;
    if (!p.isOverseas) pVal *= 1.2;
    return acc + pVal;
  }, 0);

  // Add cash adjustment
  valOffered += (offer.cashAdjustmentCr * 10);

  // Calculate value lost by receiving team
  const valRequested = requestedPlayers.reduce((acc, p) => {
    let pVal = p.overall * 1.5;
    if (p.age <= 24) pVal += (p.potential - p.overall) * 0.8;
    if (!p.isOverseas) pVal *= 1.2;
    return acc + pVal;
  }, 0);

  // Overseas balance check
  const currentOverseas = receivingTeam.rosterPlayerIds.map(id => allPlayers[id]).filter(p => p?.isOverseas).length;
  const netOverseasAdded = offeredPlayers.filter(p => p.isOverseas).length - requestedPlayers.filter(p => p.isOverseas).length;
  if (currentOverseas + netOverseasAdded > 8) {
    return { accepted: false, aiFeedback: 'Rejected: This trade would exceed our overseas player limit of 8.' };
  }

  const valueMargin = valOffered - valRequested;
  const personality = receivingTeam.aiPersonality;
  const threshold = (100 - personality.aggression) * 0.1; // Strictness threshold

  if (valueMargin >= threshold) {
    return {
      accepted: true,
      aiFeedback: `Trade Accepted! "${receivingTeam.name} management believes this trade addresses key structural requirements for our squad."`
    };
  } else {
    const deficit = Math.abs(Math.round(valueMargin / 10));
    return {
      accepted: false,
      aiFeedback: `Trade Rejected! "${receivingTeam.name} values ${requestedPlayers.map(p => p.name).join(', ')} higher than this offer. Consider adding around ₹${Math.max(1, deficit)} Cr in cash compensation or an elite talent."`
    };
  }
}
