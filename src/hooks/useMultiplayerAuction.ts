import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  MultiplayerRoomState, 
  MultiplayerAuctionConfig, 
  MultiplayerParticipant,
  MultiplayerClientEvent
} from '../types/multiplayerAuction';
import { 
  MultiplayerAuctionClient, 
  getOrCreatePlayerIdentity, 
  saveManagerName 
} from '../services/multiplayerAuctionClient';

export function useMultiplayerAuction() {
  const [identity, setIdentity] = useState<{ playerId: string; playerName: string }>(getOrCreatePlayerIdentity);
  const [roomState, setRoomState] = useState<MultiplayerRoomState | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number>(15);
  const [hammerCall, setHammerCall] = useState<string>('Opening Bid');

  const roomCodeRef = useRef<string | null>(null);

  // Sync identity
  const updateManagerIdentity = useCallback((name: string) => {
    saveManagerName(name);
    setIdentity(getOrCreatePlayerIdentity());
  }, []);

  // Update room state reference
  const handleRoomEvent = useCallback((event: MultiplayerClientEvent) => {
    if (event.type === 'STATE_UPDATE') {
      setRoomState(event.state);
      setCountdownSeconds(event.state.hammerSecondsRemaining);
      setHammerCall(event.state.hammerCall);
    } else if (event.type === 'TICK') {
      setCountdownSeconds(event.hammerSecondsRemaining);
      setHammerCall(event.hammerCall);
    } else if (event.type === 'BID_PLACED') {
      setCountdownSeconds(event.hammerSecondsRemaining);
      setHammerCall('Active Bidding');
      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          currentHighBidCr: event.currentHighBidCr,
          currentHighBidderId: event.bid.participantId,
          currentHighBidderFranchiseId: event.bid.franchiseId,
          bidHistory: [...prev.bidHistory, event.bid],
          hammerSecondsRemaining: event.hammerSecondsRemaining
        };
      });
    } else if (event.type === 'TIMER_EXTENDED') {
      setCountdownSeconds(event.hammerSecondsRemaining);
      setHammerCall('Active Bidding');
    } else if (event.type === 'BID_REJECTED') {
      if (event.playerId === identity.playerId) setErrorMessage(event.message);
    } else if (event.type === 'LOT_SOLD') {
      setHammerCall('Sold!');
      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'lot_break',
          hammerCall: 'Sold!',
          soldRecords: [...prev.soldRecords, event.record]
        };
      });
    } else if (event.type === 'LOT_UNSOLD') {
      setHammerCall('Unsold');
      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'lot_break',
          hammerCall: 'Unsold',
          unsoldPlayerIds: [...prev.unsoldPlayerIds, event.player.id]
        };
      });
    } else if (event.type === 'LOT_STARTED') {
      setCountdownSeconds(roomState?.config.timerSeconds || 15);
      setHammerCall('Opening Bid');
      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'in_progress',
          currentLotIndex: event.lotIndex,
          currentLotPlayer: event.player,
          currentHighBidCr: event.player.basePriceCr,
          currentHighBidderId: null,
          currentHighBidderFranchiseId: null,
          hammerSecondsRemaining: prev.config.timerSeconds,
          hammerCall: 'Opening Bid'
        };
      });
    } else if (event.type === 'AUCTION_PAUSED') {
      setRoomState(prev => prev ? { ...prev, isPaused: true } : prev);
    } else if (event.type === 'AUCTION_RESUMED') {
      setRoomState(prev => prev ? { ...prev, isPaused: false } : prev);
    } else if (event.type === 'AUCTION_COMPLETED') {
      setRoomState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          status: 'completed',
          rankings: event.rankings,
          awards: event.awards
        };
      });
    }
  }, [identity.playerId, roomState?.config.timerSeconds]);

  // Restore room on refresh/reconnect without destroying server auction state.
  useEffect(() => {
    const savedRoom = localStorage.getItem('ipl_multiplayer_room_code');
    if (!savedRoom || roomState) return;
    let cancelled = false;
    MultiplayerAuctionClient.joinRoom(savedRoom, identity.playerName).then(result => {
      if (!cancelled && result.success && result.state) setRoomState(result.state);
    }).catch(() => undefined);
    return () => { cancelled = true; };
  }, [identity.playerName, roomState]);

  // Subscribe to SSE whenever in a room
  useEffect(() => {
    if (!roomState?.roomCode) return;
    const roomCode = roomState.roomCode;
    roomCodeRef.current = roomCode;

    const unsubscribe = MultiplayerAuctionClient.subscribeRoomEvents(
      roomCode,
      handleRoomEvent,
      (connected) => setIsConnected(connected)
    );

    return () => {
      unsubscribe();
    };
  }, [roomState?.roomCode, handleRoomEvent]);

  // Current participant object
  const currentParticipant: MultiplayerParticipant | null = roomState 
    ? roomState.participants.find(p => p.id === identity.playerId) || null 
    : null;

  const isHost = currentParticipant?.isHost || (roomState?.hostId === identity.playerId);

  // Actions
  const createRoom = async (config?: Partial<MultiplayerAuctionConfig>) => {
    setIsLoading(true);
    setErrorMessage(null);
    const result = await MultiplayerAuctionClient.createRoom(identity.playerName, config);
    setIsLoading(false);
    if (!result.success || !result.state) {
      setErrorMessage(result.error || 'Failed to create room');
      return false;
    }
    setRoomState(result.state);
    localStorage.setItem('ipl_multiplayer_room_code', result.state.roomCode);
    return true;
  };

  const joinRoom = async (roomCode: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    const result = await MultiplayerAuctionClient.joinRoom(roomCode, identity.playerName);
    setIsLoading(false);
    if (!result.success || !result.state) {
      setErrorMessage(result.error || 'Failed to join room');
      return false;
    }
    setRoomState(result.state);
    localStorage.setItem('ipl_multiplayer_room_code', result.state.roomCode);
    return true;
  };

  const selectFranchise = async (franchiseId: string) => {
    if (!roomState) return false;
    setErrorMessage(null);
    const result = await MultiplayerAuctionClient.selectFranchise(roomState.roomCode, franchiseId);
    if (!result.success || !result.state) {
      setErrorMessage(result.error || 'Failed to select franchise');
      return false;
    }
    setRoomState(result.state);
    return true;
  };

  const toggleReady = async () => {
    if (!roomState) return false;
    setErrorMessage(null);
    const result = await MultiplayerAuctionClient.toggleReady(roomState.roomCode);
    if (!result.success || !result.state) {
      setErrorMessage(result.error || 'Failed to toggle ready');
      return false;
    }
    setRoomState(result.state);
    return true;
  };

  const updateConfig = async (config: Partial<MultiplayerAuctionConfig>) => {
    if (!roomState) return false;
    setErrorMessage(null);
    const result = await MultiplayerAuctionClient.updateConfig(roomState.roomCode, config);
    if (!result.success || !result.state) {
      setErrorMessage(result.error || 'Failed to update configuration');
      return false;
    }
    setRoomState(result.state);
    return true;
  };

  const startAuction = async () => {
    if (!roomState) return false;
    setIsLoading(true);
    setErrorMessage(null);
    const result = await MultiplayerAuctionClient.startAuction(roomState.roomCode);
    setIsLoading(false);
    if (!result.success || !result.state) {
      setErrorMessage(result.error || 'Failed to start auction');
      return false;
    }
    setRoomState(result.state);
    return true;
  };

  const placeBid = async (bidAmountCr: number) => {
    if (!roomState) return false;
    setErrorMessage(null);
    const result = await MultiplayerAuctionClient.placeBid(roomState.roomCode, bidAmountCr);
    if (!result.success || !result.state) {
      setErrorMessage(result.error || 'Bid rejected');
      return false;
    }
    setRoomState(result.state);
    return true;
  };

  const pauseAuction = async () => {
    if (!roomState) return false;
    setErrorMessage(null);
    const result = await MultiplayerAuctionClient.pauseAuction(roomState.roomCode);
    if (!result.success || !result.state) {
      setErrorMessage(result.error || 'Failed to pause auction');
      return false;
    }
    setRoomState(result.state);
    return true;
  };

  const resumeAuction = async () => {
    if (!roomState) return false;
    setErrorMessage(null);
    const result = await MultiplayerAuctionClient.resumeAuction(roomState.roomCode);
    if (!result.success || !result.state) {
      setErrorMessage(result.error || 'Failed to resume auction');
      return false;
    }
    setRoomState(result.state);
    return true;
  };

  const leaveRoom = async () => {
    if (roomState) {
      await MultiplayerAuctionClient.leaveRoom(roomState.roomCode);
    }
    localStorage.removeItem('ipl_multiplayer_room_code');
    setRoomState(null);
    setErrorMessage(null);
  };

  return {
    identity,
    updateManagerIdentity,
    roomState,
    currentParticipant,
    isHost,
    isConnected,
    isLoading,
    errorMessage,
    setErrorMessage,
    countdownSeconds,
    hammerCall,
    createRoom,
    joinRoom,
    selectFranchise,
    toggleReady,
    updateConfig,
    startAuction,
    placeBid,
    pauseAuction,
    resumeAuction,
    leaveRoom
  };
}
