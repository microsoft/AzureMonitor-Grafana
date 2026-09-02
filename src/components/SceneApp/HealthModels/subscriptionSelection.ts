import type { QueryVariable } from '@grafana/scenes';

type SubscriptionSelectionVariable = {
  state: Pick<QueryVariable['state'], 'loading' | 'options' | 'value'>;
  changeValueTo: QueryVariable['changeValueTo'];
};

export function selectFirstAvailableSubscription(subscriptionVariable: SubscriptionSelectionVariable) {
  const { loading, options, value } = subscriptionVariable.state;
  if (loading || options.length === 0) {
    return;
  }

  const selectedValue = value ? String(value) : '';
  const selectedValueExists = options.some((option) => String(option.value) === selectedValue);
  if (selectedValueExists) {
    return;
  }

  subscriptionVariable.changeValueTo(options[0].value);
}
