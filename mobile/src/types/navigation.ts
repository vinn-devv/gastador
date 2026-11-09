export type RootStackParamList = {
  "(tabs)": undefined;
  "new-expense": { amount?: string; merchant?: string } | undefined;
  scan: undefined;
  expenses: undefined;
  "new-cycle": undefined;
};

export type TabParamList = {
  index: undefined;
  allowance: undefined;
  insights: undefined;
  settings: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
