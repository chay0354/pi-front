import {createContext, useContext} from 'react';

export const FeedActionsContext = createContext({
  onOpenChat() {},
  onNeedLogin() {},
});

export function useFeedActions() {
  return useContext(FeedActionsContext);
}
