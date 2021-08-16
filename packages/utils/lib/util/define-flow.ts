import {
  AUTHENTICATION_FLOW,
  RESPONSE_TYPE,
  RESPONSE_TYPE_FLOW,
} from 'types/lib/response_type';

const defineFlow = (
  response_type: RESPONSE_TYPE[] = []
): AUTHENTICATION_FLOW => {
  return (Object.keys(RESPONSE_TYPE_FLOW) as AUTHENTICATION_FLOW[]).reduce(
    (detected: AUTHENTICATION_FLOW, current: AUTHENTICATION_FLOW) => {
      if (detected) {
        return detected;
      }
      return RESPONSE_TYPE_FLOW[current].some(
        (flowCombination: RESPONSE_TYPE[]) => {
          return (
            response_type.length === flowCombination.length &&
            response_type.every(
              (t: RESPONSE_TYPE, i: number) => flowCombination.indexOf(t) === i
            )
          );
        }
      )
        ? current
        : null;
    },
    null
  );
};

export default defineFlow;
