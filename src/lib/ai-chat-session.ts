export interface ChatRequestToken {
  conversationVersion: number;
  requestVersion: number;
}

export interface ChatRequestState {
  conversationVersion: number;
  latestRequestVersion: number;
}

export const createChatRequestState = (): ChatRequestState => ({
  conversationVersion: 0,
  latestRequestVersion: 0,
});

export function beginChatRequest(state: ChatRequestState): {
  nextState: ChatRequestState;
  token: ChatRequestToken;
} {
  const token = {
    conversationVersion: state.conversationVersion,
    requestVersion: state.latestRequestVersion + 1,
  };

  return {
    token,
    nextState: {
      conversationVersion: state.conversationVersion,
      latestRequestVersion: token.requestVersion,
    },
  };
}

export function clearChatRequestState(state: ChatRequestState): ChatRequestState {
  return {
    conversationVersion: state.conversationVersion + 1,
    latestRequestVersion: 0,
  };
}

export function isChatRequestCurrent(state: ChatRequestState, token: ChatRequestToken): boolean {
  return (
    token.conversationVersion === state.conversationVersion &&
    token.requestVersion === state.latestRequestVersion
  );
}
