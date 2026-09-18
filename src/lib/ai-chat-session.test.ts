import { beginChatRequest, clearChatRequestState, createChatRequestState, isChatRequestCurrent } from '@/lib/ai-chat-session';

describe('ai-chat-session guards', () => {
  it('invalidates an in-flight response after clear chat', () => {
    const started = beginChatRequest(createChatRequestState());
    const cleared = clearChatRequestState(started.nextState);

    expect(isChatRequestCurrent(cleared, started.token)).toBe(false);
  });

  it('invalidates an older response after a newer request starts', () => {
    const first = beginChatRequest(createChatRequestState());
    const second = beginChatRequest(first.nextState);

    expect(isChatRequestCurrent(second.nextState, first.token)).toBe(false);
    expect(isChatRequestCurrent(second.nextState, second.token)).toBe(true);
  });
});
